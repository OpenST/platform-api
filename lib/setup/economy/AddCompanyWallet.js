'use strict';
/**
 * Add company wallet in proxy factory contract
 *
 * @module lib/setup/economy/AddCompanyWallet
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress');

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/models/ddb/sharded/User');
require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');

const OpenStJs = require('@openstfoundation/openst.js');

/**
 * Class
 *
 * @class
 */
class AddCompanyWallet {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {String} params.tokenId: tokenId
   * @param {String} params.auxChainId: auxChainId
   * @param {String} params.tokenCompanyUserId: uuid of token's comapnay uuid
   * @param {Array} params.sessionKeys: session keys
   * @param {String} params.pendingTransactionExtraData: extraData for pending transaction.
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.tokenId = params['tokenId'];
    oThis.auxChainId = params['auxChainId'];
    oThis.tokenCompanyUserId = params['tokenCompanyUserId'];
    oThis.sessionKeys = params['sessionKeys'];
    oThis.pendingTransactionExtraData = params['pendingTransactionExtraData'];

    oThis.gasPrice = null;
    oThis.chainEndpoint = null;
    oThis.auxWeb3Instance = null;
    oThis.configStrategyObj = null;

    oThis.thMasterCopyAddr = null;
    oThis.proxyFactoryAddr = null;
    oThis.ownerAddr = null;
    oThis.tokenUserOpsWorkerAddr = null;
    oThis.utilityBrandedTokenAddr = null;
    oThis.tokenRulesAddr = null;
    oThis.thMasterCopyAddr = null;

    oThis.sessionKeysSpendingLimits = [];
    oThis.sessionKeysExpirationHeights = [];
  }

  /**
   * Performer
   *
   * @return {Promise<result>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error(`${__filename}::perform::catch`);
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'l_s_e_acw_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: { error: error.toString() }
        });
      }
    });
  }

  /**
   * Async performer
   *
   * @private
   *
   * @return {Promise<result>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._initializeVars();

    await oThis._validateMandatoryParams();

    await oThis._setAddresses();

    await oThis._setSessionRelatedVars();

    await oThis._setWeb3Instance();

    let submitTxRsp = await oThis._createCompanyWallet();

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskPending,
        transactionHash: submitTxRsp.data['transactionHash'],
        debugParams: {
          tokenCompanyUserId: oThis.tokenCompanyUserId,
          sessionKeys: oThis.sessionKeys,
          thMasterCopyAddr: oThis.thMasterCopyAddr,
          proxyFactoryAddr: oThis.proxyFactoryAddr,
          ownerAddr: oThis.ownerAddr,
          workerAddr: oThis.tokenUserOpsWorkerAddr,
          utilityBrandedTokenAddr: oThis.utilityBrandedTokenAddr,
          tokenRulesAddr: oThis.tokenRulesAddr
        }
      })
    );
  }

  /**
   * Initialize required variables.
   *
   * @private
   */
  async _initializeVars() {
    const oThis = this;
    oThis.chainEndpoint = oThis._configStrategyObject.chainRpcProvider(oThis.auxChainId, 'readWrite');
    oThis.gasPrice = contractConstants.auxChainGasPrice;
  }

  /**
   *
   * validate
   *
   * @return {Promise<void>}
   * @private
   */
  async _validateMandatoryParams() {
    const oThis = this;

    if (
      !CommonValidators.validateUuidV4(oThis.tokenCompanyUserId) ||
      !CommonValidators.validateEthAddressArray(oThis.sessionKeys)
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_acw_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            tokenCompanyUserId: oThis.tokenCompanyUserId,
            sessionKeys: oThis.sessionKeys
          }
        })
      );
    }
  }

  /**
   * Set addresses required for deployment of token rules.
   *
   * @private
   */
  async _setAddresses() {
    const oThis = this;

    let tokenAddressesCacheRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    if (tokenAddressesCacheRsp.isFailure() || !tokenAddressesCacheRsp.data) {
      return Promise.reject(tokenAddressesCacheRsp);
    }

    oThis.thMasterCopyAddr = tokenAddressesCacheRsp.data[tokenAddressConstants.tokenHolderMasterCopyContractKind];
    oThis.proxyFactoryAddr = tokenAddressesCacheRsp.data[tokenAddressConstants.proxyFactoryContractKind];
    oThis.ownerAddr = tokenAddressesCacheRsp.data[tokenAddressConstants.ownerAddressKind];
    oThis.tokenUserOpsWorkerAddr = tokenAddressesCacheRsp.data[tokenAddressConstants.tokenUserOpsWorkerKind];
    oThis.utilityBrandedTokenAddr = tokenAddressesCacheRsp.data[tokenAddressConstants.utilityBrandedTokenContract];
    oThis.tokenRulesAddr = tokenAddressesCacheRsp.data[tokenAddressConstants.tokenRulesContractKind];

    if (
      !oThis.thMasterCopyAddr ||
      !oThis.proxyFactoryAddr ||
      !oThis.ownerAddr ||
      !oThis.tokenUserOpsWorkerAddr ||
      !oThis.utilityBrandedTokenAddr ||
      !oThis.tokenRulesAddr
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_dtr_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            thMasterCopyAddr: oThis.thMasterCopyAddr,
            proxyFactoryAddr: oThis.proxyFactoryAddr,
            ownerAddr: oThis.ownerAddr,
            workerAddr: oThis.tokenUserOpsWorkerAddr,
            utilityBrandedTokenAddr: oThis.utilityBrandedTokenAddr,
            tokenRulesAddr: oThis.tokenRulesAddr
          }
        })
      );
    }
  }

  /**
   *
   * set session related vars
   *
   * @private
   */
  _setSessionRelatedVars() {
    const oThis = this;

    for (let i = 0; i < oThis.sessionKeys.length; i++) {
      oThis.sessionKeysExpirationHeights.push(contractConstants.companyTokenHolderSessionExpirationHeight);
      oThis.sessionKeysSpendingLimits.push(contractConstants.companyTokenHolderSessionSpendingLimit);
    }
  }

  /**
   * set Web3 Instance
   *
   * @return {Promise<void>}
   */
  async _setWeb3Instance() {
    const oThis = this;
    oThis.auxWeb3Instance = web3Provider.getInstance(oThis.chainEndpoint).web3WsProvider;
  }

  /**
   * Deploy contract
   *
   * @returns {Promise<*>}
   *
   * @private
   */
  async _createCompanyWallet() {
    const oThis = this;

    let OpenStJsUserHelper = OpenStJs.Helpers.User,
      openStJsUserHelper = new OpenStJsUserHelper(
        oThis.thMasterCopyAddr,
        null, // gnosisSafeMasterCopy is not required here
        contractConstants.nullAddress,
        contractConstants.nullAddress,
        oThis.utilityBrandedTokenAddr,
        oThis.tokenRulesAddr,
        null, // userWalletFactoryAddress is not required here
        oThis.proxyFactoryAddr,
        oThis.auxWeb3Instance
      );

    let txOptions = {
      from: oThis.tokenUserOpsWorkerAddr,
      to: oThis.proxyFactoryAddr,
      gasPrice: oThis.gasPrice,
      gas: contractConstants.addCompanyWalletGas,
      value: contractConstants.zeroValue
    };

    let txObject = await openStJsUserHelper._createCompanyWalletRawTx(
      oThis.ownerAddr,
      oThis.sessionKeys,
      oThis.sessionKeysSpendingLimits,
      oThis.sessionKeysExpirationHeights
    );

    txOptions['data'] = txObject.encodeABI();

    let submitTxRsp = await new SubmitTransaction({
      chainId: oThis.auxChainId,
      provider: oThis.chainEndpoint,
      txOptions: txOptions,
      options: oThis.pendingTransactionExtraData
    }).perform();

    if (submitTxRsp && submitTxRsp.isFailure()) {
      return Promise.reject(submitTxRsp);
    }

    return Promise.resolve(submitTxRsp);
  }

  /***
   * Config strategy
   *
   * @return {Object}
   */
  get _configStrategy() {
    const oThis = this;
    return oThis.ic().configStrategy;
  }

  /**
   * Object of config strategy class
   *
   * @return {Object}
   */
  get _configStrategyObject() {
    const oThis = this;

    if (oThis.configStrategyObj) return oThis.configStrategyObj;

    oThis.configStrategyObj = new ConfigStrategyObject(oThis._configStrategy);

    return oThis.configStrategyObj;
  }
}

InstanceComposer.registerAsShadowableClass(AddCompanyWallet, coreConstants.icNameSpace, 'AddCompanyWallet');

module.exports = {};
