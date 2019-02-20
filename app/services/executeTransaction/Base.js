'use strict';

/**
 * Base Execute Tx service
 *
 * @module app/services/executeTransaction/Base
 */

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  RuleModel = require(rootPrefix + '/app/models/mysql/Rule'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  entityConst = require(rootPrefix + '/lib/globalConstant/shard'),
  PendingTransactionCrud = require(rootPrefix + '/lib/transactions/PendingTransactionCrud'),
  ProcessTokenRuleExecutableData = require(rootPrefix +
    '/lib/executeTransactionManagement/processExecutableData/TokenRule'),
  ProcessPricerRuleExecutableData = require(rootPrefix +
    '/lib/executeTransactionManagement/processExecutableData/PricerRule'),
  rabbitmqProvider = require(rootPrefix + '/lib/providers/rabbitmq'),
  rabbitmqConstants = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  connectionTimeoutConst = require(rootPrefix + '/lib/globalConstant/connectionTimeout'),
  kwcConstant = require(rootPrefix + '/lib/globalConstant/kwc'),
  errorConstant = require(rootPrefix + '/lib/globalConstant/error'),
  TokenRuleCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenRule'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  TransactionMetaModel = require(rootPrefix + '/app/models/mysql/TransactionMeta'),
  transactionMetaConst = require(rootPrefix + '/lib/globalConstant/transactionMeta'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');
require(rootPrefix + '/app/models/ddb/sharded/Balance');
require(rootPrefix + '/lib/executeTransactionManagement/GetPublishDetails');

/**
 * Class
 *
 * @class
 */
class ExecuteTxBase extends ServiceBase {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Object} params.token_id
   * @param {Object} params.meta_property
   * @param {String} params.executable_data - executable_data json string
   * @param {Number} params.operation_type
   * @param {Object} params.meta_property
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenId = params.token_id;
    oThis.metaProperty = params.meta_property;
    oThis.executableData = params.executable_data;
    oThis.operationType = params.operation_type;

    oThis.tokenAddresses = null;
    oThis.tokenRuleAddress = null;
    oThis.pricerRuleAddress = null;
    oThis.pricerRuleData = null;
    oThis.sessionKeyAddress = null;
    oThis.pessimisticDebitAmount = null;
    oThis.unsettledDebits = null;
    oThis.transactionUuid = null;
    oThis.ruleId = null;
    oThis.configStrategyObj = null;
    oThis.rmqInstance = null;
    oThis.web3Instance = null;
    oThis.balanceShardNumber = null;
    oThis.tokenHolderAddress = null;
    oThis.gas = null;
    oThis.nonce = null;
    oThis.gasPrice = null;
    oThis.estimatedTransfers = null;

    oThis.pessimisticAmountDebitted = null;
    oThis.pendingTransactionInserted = null;
    oThis.transactionMetaId = null;
  }

  /**
   * Main performer method for the class.
   *
   * @returns {Promise<T>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(async function(err) {
      let customError;
      if (responseHelper.isCustomResult(err)) {
        customError = err;
      } else {
        logger.error(`In catch block of ${__filename}`, err);
        customError = responseHelper.error({
          internal_error_identifier: 's_et_b_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { error: err.toString() }
        });
      }

      await oThis._revertOperations();

      return customError;
    });
  }

  async _revertOperations() {
    const oThis = this;

    if (oThis.pessimisticAmountDebitted) {
      logger.debug('something_went_wrong rolling back pessimitic debitted balances');
      await oThis._rollBackPessimisticDebit().catch(async function(rollbackError) {
        // TODO: Mark user balance as dirty
        logger.error(`In catch block of _rollBackPessimisticDebit in file: ${__filename}`, rollbackError);
      });
    }

    if (oThis.pendingTransactionInserted) {
      // update pending transaction to mark failed.
    }

    if (oThis.transactionMetaId) {
      await new TransactionMetaModel().markAsQueuedFailedByTxUuid(oThis.transactionUuid);
    }
  }

  /**
   *
   * @return {Promise<void>}
   * @private
   */
  async _initializeVars() {
    const oThis = this;

    oThis.toAddress = basicHelper.sanitizeAddress(oThis.executableData.to);
    oThis.gasPrice = contractConstants.auxChainGasPrice;

    await oThis._setRmqInstance();

    await oThis._setWebInstance();

    await oThis._setTokenHolderAddress();
  }

  /**
   *
   * @private
   */
  async _tokenAddresses() {
    const oThis = this;

    if (oThis.tokenAddresses) {
      return oThis.tokenAddresses;
    }

    let getAddrRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    if (getAddrRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_et_b_1',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.tokenAddresses = getAddrRsp.data;

    return oThis.tokenAddresses;
  }

  /**
   *
   * @return {Promise<string>}
   * @private
   */
  async _tokenRuleAddress() {
    const oThis = this;
    if (oThis.tokenRuleAddress) {
      return oThis.tokenRuleAddress;
    }
    let tokenAddresses = await oThis._tokenAddresses();
    oThis.tokenRuleAddress = tokenAddresses[tokenAddressConstants.tokenRulesContractKind];
    if (!oThis.tokenRuleAddress) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_et_b_7',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }
    return oThis.tokenRuleAddress;
  }

  /**
   *
   * @private
   */
  async _pricerRuleData() {
    const oThis = this;

    if (oThis.pricerRuleData) {
      return oThis.pricerRuleData;
    }

    let fetchPricerRuleRsp = await RuleModel.getPricerRuleDetails();

    if (fetchPricerRuleRsp.isFailure()) {
      return Promise.reject(fetchPricerRuleRsp);
    }

    oThis.ruleId = fetchPricerRuleRsp.data.id;

    let tokenRuleCache = new TokenRuleCache({ tokenId: oThis.tokenId, ruleId: oThis.ruleId }),
      tokenRuleCacheRsp = await tokenRuleCache.fetch();

    if (tokenRuleCacheRsp.isFailure() || !tokenRuleCacheRsp.data) {
      return Promise.reject(tokenRuleCacheRsp);
    }

    oThis.pricerRuleData = tokenRuleCacheRsp.data;

    return oThis.pricerRuleData;
  }

  /**
   *
   * @return {Promise<string>}
   * @private
   */
  async _pricerRuleAddress() {
    const oThis = this;
    if (oThis.pricerRuleAddress) {
      return oThis.pricerRuleAddress;
    }
    let pricerRuleData = await oThis._pricerRuleData();
    oThis.pricerRuleAddress = pricerRuleData.address;
    if (!oThis.pricerRuleAddress) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_et_b_8',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }
    return oThis.pricerRuleAddress;
  }

  /**
   *
   * @private
   */
  async _processExecutableData() {
    const oThis = this;

    let response,
      tokenRuleAddress = await oThis._tokenRuleAddress(),
      pricerRuleAddress = await oThis._pricerRuleAddress();

    if (tokenRuleAddress === oThis.toAddress) {
      response = await new ProcessTokenRuleExecutableData({
        executableData: oThis.executableData,
        contractAddress: oThis.tokenRuleAddress,
        web3Instance: oThis.web3Instance,
        tokenHolderAddress: oThis.tokenHolderAddress
      }).perform();
    } else if (pricerRuleAddress === oThis.toAddress) {
      response = await new ProcessPricerRuleExecutableData({
        executableData: oThis.executableData,
        contractAddress: oThis.pricerRuleAddress,
        web3Instance: oThis.web3Instance,
        tokenHolderAddress: oThis.tokenHolderAddress
      }).perform();
    } else {
      return oThis._validationError('s_et_b_4', ['invalid_executable_data'], {
        executableData: oThis.executableData
      });
    }

    if (response.isFailure()) {
      return Promise.reject(response);
    }

    oThis.pessimisticDebitAmount = response.data.pessimisticDebitAmount;
    oThis.transferExecutableData = response.data.transferExecutableData;
    oThis.estimatedTransfers = response.data.estimatedTransfers;
    oThis.gas = response.data.gas;
  }

  /**
   *
   * @private
   */
  async _setBalanceShardNumber() {
    const oThis = this,
      TokenShardNumbersCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenShardNumbersCache');

    let response = await new TokenShardNumbersCache({ tokenId: oThis.tokenId }).fetch();

    let balanceShardNumber = response.data[entityConst.balanceEntityKind];

    if (!balanceShardNumber) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_et_b_6',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            shards: response.data
          }
        })
      );
    }

    oThis.balanceShardNumber = balanceShardNumber;
  }

  /**
   *
   * @private
   */
  async _performPessimisticDebit() {
    const oThis = this;

    await oThis._setBalanceShardNumber();

    let BalanceModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BalanceModel'),
      balanceObj = new BalanceModel({ shardNumber: oThis.balanceShardNumber });

    let tokenAddresses = await oThis._tokenAddresses();
    let buffer = {
      erc20Address: tokenAddresses[tokenAddressConstants.utilityBrandedTokenContract],
      tokenHolderAddress: oThis.tokenHolderAddress,
      blockChainUnsettleDebits: oThis.pessimisticDebitAmount.toString(10)
    };

    let updateBalanceRsp = await balanceObj.updateBalance(buffer).catch(function(updateBalanceResponse) {
      if (updateBalanceResponse.internalErrorCode.endsWith(errorConstant.conditionalCheckFailedExceptionSuffix)) {
        return oThis._validationError('s_et_b_9', ['insufficient_funds']);
      }
      return updateBalanceResponse;
    });

    if (updateBalanceRsp.isFailure()) {
      return Promise.reject(updateBalanceRsp);
    }

    oThis.pessimisticAmountDebitted = true;

    oThis.unsettledDebits = [buffer];
  }

  async _createTransactionMeta() {
    const oThis = this;
    oThis.transactionUuid = uuidv4();

    let txMetaResp = await new TransactionMetaModel()
      .insert({
        transaction_uuid: oThis.transactionUuid,
        associated_aux_chain_id: oThis.auxChainId,
        token_id: oThis.tokenId,
        status: transactionMetaConst.queuedStatus,
        kind: transactionMetaConst.ruleExecution,
        next_action_at: transactionMetaConst.getNextActionAtFor(transactionMetaConst.queuedStatus),
        session_address: oThis.sessionKeyAddress,
        session_nonce: oThis.nonce
      })
      .fire();

    oThis.transactionMetaId = txMetaResp.insertId;
  }

  /**
   *
   *
   * @private
   */
  async _rollBackPessimisticDebit() {
    const oThis = this;

    let BalanceModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BalanceModel'),
      balanceObj = new BalanceModel({ shardNumber: oThis.balanceShardNumber });

    let tokenAddresses = await oThis._tokenAddresses();
    let buffer = {
      erc20Address: tokenAddresses[tokenAddressConstants.utilityBrandedTokenContract],
      tokenHolderAddress: oThis.tokenHolderAddress,
      blockChainUnsettleDebits: oThis.pessimisticDebitAmount.mul(-1).toString(10)
    };

    await balanceObj.updateBalance(buffer);
  }

  /***
   *
   * Create Pending transaction in Db
   *
   * @return {Promise<*>}
   */
  async _createPendingTransaction() {
    const oThis = this;

    let insertRsp = await new PendingTransactionCrud(oThis.auxChainId).create({
      transactionData: {
        to: oThis.toAddress,
        value: oThis.executableData.value,
        gas: oThis.gas,
        gasPrice: oThis.gasPrice,
        nonce: oThis.nonce
      },
      unsettledDebits: oThis.unsettledDebits,
      eip1077Signature: oThis.signatureData,
      metaProperty: oThis.metaProperty,
      ruleId: oThis.ruleId,
      transferExecutableData: oThis.transferExecutableData,
      transfers: oThis.estimatedTransfers,
      transactionUuid: oThis.transactionUuid
    });

    if (insertRsp.isFailure()) {
      return Promise.reject(insertRsp);
    } else {
      oThis.pendingTransactionInserted = 1;
    }
  }

  /**
   *
   * @return {Promise<void>}
   * @private
   */
  async _publishToRMQ() {
    const oThis = this,
      ExTxGetPublishDetails = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ExTxGetPublishDetails'),
      exTxGetPublishDetails = new ExTxGetPublishDetails({
        tokenId: oThis.tokenId,
        ephemeralAddress: oThis.sessionKeyAddress
      });

    let publishDetails = await exTxGetPublishDetails.perform();

    let messageParams = {
      topics: [publishDetails.topicName],
      publisher: 'OST',
      message: {
        kind: kwcConstant.executeTx,
        payload: {
          tokenAddressId: publishDetails.tokenAddressId,
          transaction_uuid: oThis.transactionUuid,
          transactionMetaId: oThis.transactionMetaId
        }
      }
    };

    let setToRMQ = await oThis.rmqInstance.publishEvent.perform(messageParams);

    if (setToRMQ.isFailure()) {
      return Promise.reject(setToRMQ);
    }

    return setToRMQ;
  }

  async _setRmqInstance() {
    const oThis = this;
    oThis.rmqInstance = await rabbitmqProvider.getInstance(rabbitmqConstants.auxRabbitmqKind, {
      connectionWaitSeconds: connectionTimeoutConst.crons,
      switchConnectionWaitSeconds: connectionTimeoutConst.switchConnectionCrons,
      auxChainId: oThis.auxChainId
    });
  }

  async _setWebInstance() {
    const oThis = this;
    oThis.web3Instance = await web3Provider.getInstance(oThis._configStrategyObject.auxChainWsProvider).web3WsProvider;
  }

  /**
   *
   * @param {string} code
   * @param {array} paramErrors
   * @param {object} debugOptions
   *
   * @return {Promise}
   */
  _validationError(code, paramErrors, debugOptions) {
    const oThis = this;
    return Promise.reject(
      responseHelper.paramValidationError({
        internal_error_identifier: code,
        api_error_identifier: 'invalid_params',
        params_error_identifiers: paramErrors,
        debug_options: debugOptions
      })
    );
  }

  /**
   * Object of config strategy class
   *
   * @return {Object}
   */
  get _configStrategyObject() {
    const oThis = this;

    if (oThis.configStrategyObj) return oThis.configStrategyObj;

    oThis.configStrategyObj = new ConfigStrategyObject(oThis.ic().configStrategy);

    return oThis.configStrategyObj;
  }

  get auxChainId() {
    const oThis = this;
    return oThis._configStrategyObject.auxChainId;
  }

  async _setTokenHolderAddress() {
    throw 'subclass to implement';
  }

  /**
   *
   * @private
   */
  async _setSessionAddress() {
    throw 'subclass to implement';
  }

  /**
   *
   * @private
   */
  async _setNonce() {
    throw 'subclass to implement';
  }

  async _setSignature() {
    throw 'subclass to implement';
  }
}

module.exports = ExecuteTxBase;
