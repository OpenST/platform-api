/**
 * Module for execute transaction base.
 *
 * @module app/services/transaction/execute/Base
 */

const uuidv4 = require('uuid/v4'),
  OpenSTJs = require('@openst/openst.js'),
  TokenHolderHelper = OpenSTJs.Helpers.TokenHolder;

const rootPrefix = '../../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  NonceForSession = require(rootPrefix + '/lib/nonce/get/ForSession'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  TransactionMetaModel = require(rootPrefix + '/app/models/mysql/TransactionMeta'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  PendingTransactionCrud = require(rootPrefix + '/lib/transactions/PendingTransactionCrud'),
  ProcessTokenRuleExecutableData = require(rootPrefix +
    '/lib/executeTransactionManagement/processExecutableData/TokenRule'),
  ProcessPricerRuleExecutableData = require(rootPrefix +
    '/lib/executeTransactionManagement/processExecutableData/PricerRule'),
  TokenRuleDetailsByTokenId = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenRuleDetailsByTokenId'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  kwcConstant = require(rootPrefix + '/lib/globalConstant/kwc'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  entityConst = require(rootPrefix + '/lib/globalConstant/shard'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ruleConstants = require(rootPrefix + '/lib/globalConstant/rule'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  errorConstant = require(rootPrefix + '/lib/globalConstant/error'),
  shardConstant = require(rootPrefix + '/lib/globalConstant/shard'),
  rabbitmqProvider = require(rootPrefix + '/lib/providers/rabbitmq'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  rabbitmqConstants = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  errorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  publishToPreProcessor = require(rootPrefix + '/lib/webhooks/publishToPreProcessor'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  transactionMetaConst = require(rootPrefix + '/lib/globalConstant/transactionMeta'),
  connectionTimeoutConstants = require(rootPrefix + '/lib/globalConstant/connectionTimeout'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  webhookSubscriptionsConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');
require(rootPrefix + '/app/models/ddb/sharded/Balance');
require(rootPrefix + '/lib/executeTransactionManagement/GetPublishDetails');
require(rootPrefix + '/lib/cacheManagement/chainMulti/UserDetail');

/**
 * Class for execute transaction base.
 *
 * @class ExecuteTxBase
 */
class ExecuteTxBase extends ServiceBase {
  /**
   * Constructor for execute transaction base.
   *
   * @param {object} params
   * @param {string} params.user_id: user_id
   * @param {number} params.token_id: token id
   * @param {object} params.client_id: client id
   * @param {string} params.to: rules address
   * @param {object} params.raw_calldata: raw_calldata
   * @param {object} [params.meta_property]
   *
   * @augments ServiceBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.userId = params.user_id;
    oThis.tokenId = params.token_id;
    oThis.clientId = params.client_id;
    oThis.toAddress = params.to;
    oThis.rawCalldata = params.raw_calldata;
    oThis.metaProperty = params.meta_property;

    oThis.tokenAddresses = null;
    oThis.erc20Address = null;
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
    oThis.sessionKeyNonce = null;
    oThis.gasPrice = null;
    oThis.estimatedTransfers = null;
    oThis.failureStatusToUpdateInTxMeta = null;
    oThis.pessimisticAmountDebited = null;
    oThis.pendingTransactionInserted = null;
    oThis.transactionMetaId = null;
    oThis.token = null;
    oThis.userData = null;
    oThis.pendingTransactionData = null;
    oThis.callPrefix = null;
    oThis.executableTxData = null;
  }

  /**
   * Main performer for class.
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

      await oThis._revertOperations(customError);

      return customError;
    });
  }

  /**
   * Async perform.
   *
   * @return {Promise<any>}
   */
  async _asyncPerform() {
    const oThis = this,
      timeNow = Date.now();

    logger.debug('execute_tx_step_: 1', oThis.transactionUuid);

    await oThis._validateAndSanitize();

    logger.debug('execute_tx_step_: 2', oThis.transactionUuid);

    await oThis._initializeVars();

    logger.debug('execute_tx_step_: 3', oThis.transactionUuid);

    await oThis._processExecutableData();

    logger.debug('execute_tx_step_: 4', oThis.transactionUuid);

    await oThis._customValidationsOnExecutableData();

    logger.debug('execute_tx_step_: 5', oThis.transactionUuid);

    await oThis._setSessionAddress();

    logger.debug('execute_tx_step_: 6', oThis.transactionUuid);

    await oThis._setNonce();

    logger.debug('execute_tx_step_: 7', oThis.transactionUuid);

    oThis._setExecutableTxData();

    logger.debug('execute_tx_step_: 8', oThis.transactionUuid);

    await oThis._setSignature();

    logger.debug('execute_tx_step_: 9', oThis.transactionUuid);

    await oThis._verifySessionSpendingLimit();

    logger.debug('execute_tx_step_: 10', oThis.transactionUuid);

    await oThis._createTransactionMeta();

    logger.debug('execute_tx_step_: 11', oThis.transactionUuid);

    await oThis._performPessimisticDebit();

    logger.debug('execute_tx_step_: 12', oThis.transactionUuid);

    await oThis._createPendingTransaction();

    logger.debug('execute_tx_step_: 13', oThis.transactionUuid);

    await oThis._createUserRedemptionRequest();

    logger.debug('execute_tx_step_: 14', oThis.transactionUuid);

    await oThis._publishToRMQ();

    logger.debug('execute_tx_step_: 15', oThis.transactionUuid);

    await oThis._sendPreprocessorWebhook();

    logger.debug('Final_Step_execute_tx_step_: 16', oThis.transactionUuid, ' in ', Date.now() - timeNow, 'ms');

    return Promise.resolve(
      responseHelper.successWithData({
        [resultType.transaction]: oThis.pendingTransactionData
      })
    );
  }

  /**
   * Initializes web3 and rmq instances and fetches token holder address.
   *
   * @sets oThis.toAddress, oThis.gasPrice, oThis.transactionUuid
   *
   * @return {Promise<void>}
   * @private
   */
  async _initializeVars() {
    const oThis = this;

    oThis.toAddress = basicHelper.sanitizeAddress(oThis.toAddress);
    oThis.gasPrice = contractConstants.auxChainGasPrice;
    oThis.transactionUuid = uuidv4();

    await oThis._setRmqInstance();

    await oThis._setWeb3Instance();

    await oThis._validateTokenStatus();

    await oThis._setTokenAddresses();

    await oThis._setTokenShardDetails();

    await oThis._setCurrentUserData();

    await oThis._setTokenHolderAddress();

    oThis._setCallPrefix();
  }

  /**
   * Process executable data.
   *
   * @sets oThis.pessimisticDebitAmount, oThis.transferExecutableData, oThis.estimatedTransfers, oThis.gas
   *
   * @returns {Promise<Promise|Promise<*|Promise<never>|undefined>>}
   * @private
   */
  async _processExecutableData() {
    const oThis = this;

    const ruleDetails = await oThis._getRulesDetails();

    let response;

    if (oThis.toAddress === oThis.tokenRuleAddress) {
      oThis.ruleId = ruleDetails[ruleConstants.tokenRuleName].ruleId;
      response = await new ProcessTokenRuleExecutableData({
        contractAddress: oThis.tokenRuleAddress,
        web3Instance: oThis.web3Instance,
        tokenHolderAddress: oThis.tokenHolderAddress,
        rawCallData: oThis.rawCalldata
      }).perform();
    } else if (oThis.toAddress === oThis.pricerRuleAddress) {
      oThis.ruleId = ruleDetails[ruleConstants.pricerRuleName].ruleId;
      response = await new ProcessPricerRuleExecutableData({
        contractAddress: oThis.pricerRuleAddress,
        web3Instance: oThis.web3Instance,
        tokenHolderAddress: oThis.tokenHolderAddress,
        auxChainId: oThis.auxChainId,
        token: oThis.token,
        rawCallData: oThis.rawCalldata
      }).perform();
    } else {
      return oThis._validationError('s_et_b_2', ['invalid_to'], {
        toAddress: oThis.toAddress
      });
    }

    if (response.isFailure()) {
      return Promise.reject(response);
    }

    const responseData = response.data;

    oThis.pessimisticDebitAmount = responseData.pessimisticDebitAmount;
    oThis.transferExecutableData = responseData.transferExecutableData;
    oThis.estimatedTransfers = responseData.estimatedTransfers;
    oThis.gas = responseData.gas;

    await oThis._setUserUuidsInEstimatedTransfers(responseData.transferToAddresses);
  }

  /**
   * Set user uuids.
   *
   * @param {array} transferToAddresses
   *
   * @returns {Promise<Promise|Promise<Promise<never>|*|undefined>>}
   * @private
   */
  async _setUserUuidsInEstimatedTransfers(transferToAddresses) {
    const oThis = this;

    const UserDetailCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserDetailCache'),
      userDetailRsp = await new UserDetailCache({
        tokenId: oThis.tokenId,
        tokenHolderAddresses: transferToAddresses,
        shardNumber: oThis.tokenShardDetails[shardConstant.userEntityKind]
      }).fetch();
    if (userDetailRsp.isFailure()) {
      return Promise.reject(userDetailRsp);
    }

    const userDetailsData = userDetailRsp.data;

    // Merge oThis.userId's data in user details.
    userDetailsData[oThis.userData.tokenHolderAddress] = oThis.userData;

    for (let index = 0; index < transferToAddresses.length; index++) {
      const userDetail = userDetailsData[transferToAddresses[index]];

      if (!CommonValidators.validateObject(userDetail) || userDetail.tokenId != oThis.tokenId) {
        return oThis._validationError('s_et_b_3', ['invalid_raw_calldata_parameter_address'], {
          transferToAddresses: transferToAddresses
        });
      }
    }

    for (let index = 0; index < oThis.estimatedTransfers.length; index++) {
      const estimatedTransfer = oThis.estimatedTransfers[index],
        fromUserData = userDetailsData[estimatedTransfer.fromAddress],
        toUserData = userDetailsData[estimatedTransfer.toAddress];

      if (fromUserData && fromUserData.userId) {
        estimatedTransfer.fromUserId = fromUserData.userId;
      }
      if (toUserData && toUserData.userId) {
        estimatedTransfer.toUserId = toUserData.userId;
      }
    }
  }

  /**
   * Perform pessimistic debit.
   *
   * @sets oThis.pessimisticAmountDebited, oThis.unsettledDebits
   *
   * @returns {Promise<void>}
   * @private
   */
  async _performPessimisticDebit() {
    const oThis = this;

    await oThis._setBalanceShardNumber();

    const BalanceModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BalanceModel'),
      balanceObj = new BalanceModel({ shardNumber: oThis.balanceShardNumber });

    const balanceUpdateParams = {
      erc20Address: oThis.tokenAddresses[tokenAddressConstants.utilityBrandedTokenContract],
      tokenHolderAddress: oThis.tokenHolderAddress,
      blockChainUnsettleDebits: basicHelper.formatWeiToString(oThis.pessimisticDebitAmount)
    };

    await balanceObj.updateBalance(balanceUpdateParams).catch(function(updateBalanceResponse) {
      logger.error(updateBalanceResponse);
      if (updateBalanceResponse.internalErrorCode.endsWith(errorConstant.insufficientFunds)) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: `s_et_b_4:${updateBalanceResponse.internalErrorCode}`,
            api_error_identifier: 'insufficient_funds',
            debug_options: {
              balanceUpdateParams: balanceUpdateParams
            }
          })
        );
      }
      logger.error('updateBalance error in app/services/transaction/execute/Base', updateBalanceResponse);

      return Promise.reject(updateBalanceResponse);
    });

    oThis.pessimisticAmountDebited = true;
    oThis.unsettledDebits = [balanceUpdateParams];
  }

  /**
   * Get balance shard for token id
   *
   * @private
   */
  /**
   * Get balance shard for token id.
   *
   * @sets oThis.balanceShardNumber
   *
   * @returns {Promise<Promise<never>|undefined>}
   * @private
   */
  async _setBalanceShardNumber() {
    const oThis = this,
      TokenShardNumbersCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenShardNumbersCache');

    const response = await new TokenShardNumbersCache({ tokenId: oThis.tokenId }).fetch();

    const balanceShardNumber = response.data[entityConst.balanceEntityKind];

    if (!balanceShardNumber) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_et_b_5',
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
   * Create entry in tx meta table.
   *
   * @sets oThis.transactionMetaId
   *
   * @return {Promise<void>}
   * @private
   */
  async _createTransactionMeta() {
    const oThis = this;

    const createRsp = await new TransactionMetaModel()
      .insert({
        transaction_uuid: oThis.transactionUuid,
        associated_aux_chain_id: oThis.auxChainId,
        token_id: oThis.tokenId,
        status: transactionMetaConst.invertedStatuses[transactionMetaConst.queuedStatus],
        kind: transactionMetaConst.invertedKinds[transactionMetaConst.ruleExecution],
        next_action_at: transactionMetaConst.getNextActionAtFor(transactionMetaConst.queuedStatus),
        session_address: oThis.sessionKeyAddress,
        session_nonce: oThis.sessionKeyNonce
      })
      .fire();

    oThis.transactionMetaId = createRsp.insertId;
  }

  /**
   * Rollback pessimistic debit.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _rollBackPessimisticDebit() {
    const oThis = this;

    const BalanceModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BalanceModel'),
      balanceObj = new BalanceModel({ shardNumber: oThis.balanceShardNumber });

    const buffer = {
      erc20Address: oThis.tokenAddresses[tokenAddressConstants.utilityBrandedTokenContract],
      tokenHolderAddress: oThis.tokenHolderAddress,
      blockChainUnsettleDebits: basicHelper.formatWeiToString(oThis.pessimisticDebitAmount.mul(-1))
    };

    await balanceObj.updateBalance(buffer);
  }

  /**
   * Create pending transaction in Db.
   *
   * @sets oThis.pendingTransactionInserted, oThis.pendingTransactionData
   *
   * @returns {Promise<Promise<never>|undefined>}
   * @private
   */
  async _createPendingTransaction() {
    const oThis = this,
      currentTimestamp = basicHelper.getCurrentTimestampInSeconds();

    const insertRsp = await new PendingTransactionCrud(oThis.auxChainId).create({
      transactionData: {
        to: oThis.tokenHolderAddress,
        gas: oThis.gas,
        gasPrice: oThis.gasPrice
      },
      unsettledDebits: oThis.unsettledDebits,
      eip1077Signature: oThis.signatureData,
      metaProperty: oThis.metaProperty,
      ruleId: oThis.ruleId,
      transferExecutableData: oThis.transferExecutableData,
      transfers: oThis.estimatedTransfers,
      transactionUuid: oThis.transactionUuid,
      ruleAddress: oThis.toAddress,
      erc20Address: oThis.erc20Address,
      sessionKeyNonce: oThis.sessionKeyNonce,
      sessionKeyAddress: oThis.sessionKeyAddress,
      status: pendingTransactionConstants.createdStatus,
      tokenId: oThis.tokenId,
      kind: pendingTransactionConstants.executeRuleKind,
      toBeSyncedInEs: 1,
      redemptionDetails: oThis.redemptionDetails || null,
      createdTimestamp: currentTimestamp,
      updatedTimestamp: currentTimestamp
    });
    if (insertRsp.isFailure()) {
      return Promise.reject(insertRsp);
    }
    logger.debug('inserted inTxMeta with id: ', oThis.transactionUuid);

    oThis.pendingTransactionInserted = 1;
    oThis.pendingTransactionData = insertRsp.data;
  }

  /**
   * Publish to RMQ.
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

    const publishDetails = await exTxGetPublishDetails.perform().catch(async function(error) {
      logger.error(`In catch block of exTxGetPublishDetails in file: ${__filename}`, error);

      return Promise.reject(error);
    });

    const messageParams = {
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

    const setToRMQ = await oThis.rmqInstance.publishEvent.perform(messageParams);

    if (setToRMQ.isFailure()) {
      oThis.failureStatusToUpdateInTxMeta = transactionMetaConst.queuedFailedStatus;

      return Promise.reject(setToRMQ);
    }

    return setToRMQ;
  }

  /**
   * Revert operations.
   *
   * @param {object} customError
   *
   * @return {Promise<void>}
   * @private
   */
  async _revertOperations(customError) {
    const oThis = this;

    await oThis._revertPessimisticDebit();

    if (oThis.pendingTransactionInserted) {
      // We are not sending transaction failure webhook as transactionUuid is not returned to the user yet.
      await new PendingTransactionCrud(oThis.auxChainId)
        .update({
          transactionUuid: oThis.transactionUuid,
          status: pendingTransactionConstants.failedStatus
        })
        .catch(async function() {
          // Do nothing as UUid wouldn't be returned to user and no get calls would come hence forth.
        });
    }

    if (oThis.transactionMetaId) {
      await new TransactionMetaModel().updateRecordsByReleasingLock({
        status: oThis.failureStatusToUpdateInTxMeta || transactionMetaConst.finalFailedStatus,
        receiptStatus: transactionMetaConst.failureReceiptStatus,
        id: oThis.transactionMetaId,
        debugParams: customError.toHash()
      });
    }

    if (oThis.sessionKeyAddress) {
      await new NonceForSession({
        address: oThis.sessionKeyAddress,
        chainId: oThis.auxChainId
      }).clear();
    }
  }

  /**
   * Revert pessimistic debit.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _revertPessimisticDebit() {
    const oThis = this;

    if (oThis.pessimisticAmountDebited) {
      logger.debug('something_went_wrong rolling back pessimistic debited balances');

      await oThis._rollBackPessimisticDebit().catch(async function(rollbackError) {
        logger.error('In catch block of _rollBackPessimisticDebit', rollbackError);

        if (oThis.pendingTransactionInserted) {
          // If entry was inserted in pending_tx table, error handler could come and rollback balances later
          oThis.failureStatusToUpdateInTxMeta = transactionMetaConst.rollBackBalanceStatus;
        } else {
          // Notify so that devs can manually revert balance

          const errorObject = responseHelper.error({
            internal_error_identifier: 's_et_b_6',
            api_error_identifier: 'balance_rollback_failed',
            debug_options: {
              unsettledDebits: oThis.unsettledDebits
            }
          });

          await createErrorLogsEntry.perform(errorObject, errorLogsConstants.mediumSeverity);
        }
      });
    }
  }

  /**
   * Create a RabbitMQ instance.
   *
   * @sets oThis.rmqInstance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setRmqInstance() {
    const oThis = this;

    oThis.rmqInstance = await rabbitmqProvider.getInstance(rabbitmqConstants.auxRabbitmqKind, {
      connectionWaitSeconds: connectionTimeoutConstants.crons,
      switchConnectionWaitSeconds: connectionTimeoutConstants.switchConnectionCrons,
      auxChainId: oThis.auxChainId
    });
  }

  /**
   * Create auxiliary web3 instance.
   *
   * @sets oThis.web3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    oThis.web3Instance = await web3Provider.getInstance(oThis._configStrategyObject.auxChainWsProvider).web3WsProvider;
  }

  /**
   * Get token rule details from cache.
   *
   * @sets oThis.tokenRuleAddress, oThis.pricerRuleAddress
   *
   * @return {Promise<never>}
   * @private
   */
  async _getRulesDetails() {
    const oThis = this;

    const tokenRuleDetailsCacheRsp = await new TokenRuleDetailsByTokenId({ tokenId: oThis.tokenId }).fetch();

    if (tokenRuleDetailsCacheRsp.isFailure() || !tokenRuleDetailsCacheRsp.data) {
      return Promise.reject(tokenRuleDetailsCacheRsp);
    }

    oThis.tokenRuleAddress = tokenRuleDetailsCacheRsp.data[ruleConstants.tokenRuleName].address;
    oThis.pricerRuleAddress = tokenRuleDetailsCacheRsp.data[ruleConstants.pricerRuleName].address;

    return tokenRuleDetailsCacheRsp.data;
  }

  /**
   * Fetch token addresses from cache
   *
   * @private
   */
  /**
   * Fetch token addresses from cache.
   *
   * @sets oThis.tokenAddresses, oThis.erc20Address
   *
   * @returns {Promise<Promise<never>|undefined>}
   * @private
   */
  async _setTokenAddresses() {
    const oThis = this;

    const getAddrRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    if (getAddrRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_et_b_7',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.tokenAddresses = getAddrRsp.data;
    oThis.erc20Address = oThis.tokenAddresses[tokenAddressConstants.utilityBrandedTokenContract];
  }

  /**
   * Return validation error.
   *
   * @param {string} code
   * @param {array} paramErrors
   * @param {object} debugOptions
   *
   * @return {Promise}
   * @private
   */
  _validationError(code, paramErrors, debugOptions) {
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
   * Object of config strategy class.
   *
   * @sets oThis.configStrategyObj
   *
   * @return {object}
   */
  get _configStrategyObject() {
    const oThis = this;

    if (oThis.configStrategyObj) {
      return oThis.configStrategyObj;
    }

    oThis.configStrategyObj = new ConfigStrategyObject(oThis.ic().configStrategy);

    return oThis.configStrategyObj;
  }

  /**
   * Set call prefix.
   *
   * @sets oThis.callPrefix
   *
   * @private
   */
  _setCallPrefix() {
    const oThis = this,
      tokenHolderHelper = new TokenHolderHelper(oThis.web3Instance, oThis.tokenHolderAddress);

    oThis.callPrefix = tokenHolderHelper.getTokenHolderExecuteRuleCallPrefix();
  }

  /**
   * Set executable tx data.
   *
   * @sets oThis.executableTxData
   *
   * @private
   */
  _setExecutableTxData() {
    const oThis = this;

    oThis.executableTxData = {
      from: oThis.web3Instance.utils.toChecksumAddress(oThis.tokenHolderAddress), // TH proxy address
      to: oThis.web3Instance.utils.toChecksumAddress(oThis.toAddress), // Rule contract address (TR / Pricer)
      data: oThis.transferExecutableData,
      nonce: oThis.sessionKeyNonce,
      callPrefix: oThis.callPrefix
    };
  }

  get auxChainId() {
    const oThis = this;

    return oThis._configStrategyObject.auxChainId;
  }

  /**
   * Send webhook message to Preprocessor.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _sendPreprocessorWebhook() {
    const oThis = this;

    const payload = {
      userId: oThis.userId,
      webhookKind: webhookSubscriptionsConstants.transactionsInitiateTopic,
      clientId: oThis.clientId,
      tokenId: oThis.tokenId,
      transactionUuid: oThis.transactionUuid
    };

    await publishToPreProcessor.perform(oThis.auxChainId, payload);
  }

  /**
   * Set current user data.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _setCurrentUserData() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Set token holder address.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _setTokenHolderAddress() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Set token shard details.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _setTokenShardDetails() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Set session address which would sign this transaction.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _setSessionAddress() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Set nonce.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _setNonce() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Set signature.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _setSignature() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Validate and sanitize params.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _validateAndSanitize() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Verify session spending limit.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _verifySessionSpendingLimit() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Custom validations over executable data
   *
   * @returns {Promise<void>}
   * @private
   */
  async _customValidationsOnExecutableData() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Create User Redemption request, if transaction is for redemption
   *
   * @returns {Promise<void>}
   * @private
   */
  async _createUserRedemptionRequest() {
    throw new Error('Sub-class to implement.');
  }
}

module.exports = ExecuteTxBase;
