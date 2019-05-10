/**
 * Add company wallet in proxy factory contract
 *
 * @module lib/setup/economy/AddCompanyWallet
 */
const BigNumber = require('bignumber.js'),
  OSTBase = require('@ostdotcom/base'),
  OpenSTJs = require('@openst/openst.js'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  TokenCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  StakeCurrencyByIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyById'),
  conversionRatesConstants = require(rootPrefix + '/lib/globalConstant/conversionRates'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/models/ddb/sharded/User');
require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');

/**
 * Class for adding company wallet.
 *
 * @class AddCompanyWallet
 */
class AddCompanyWallet {
  /**
   * Constructor for adding company wallet.
   *
   * @param {Object} params
   * @param {String} params.tokenId: tokenId
   * @param {String/Number} params.clientId: clientId
   * @param {String} params.auxChainId: auxChainId
   * @param {String} params.tokenCompanyUserId: uuid of token's company uuid
   * @param {Array} params.sessionKeys: session keys
   * @param {String} params.pendingTransactionExtraData: extraData for pending transaction.
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.tokenId = params.tokenId;
    oThis.clientId = params.clientId;
    oThis.auxChainId = params.auxChainId;
    oThis.tokenCompanyUserId = params.tokenCompanyUserId;
    oThis.sessionKeys = params.sessionKeys;
    oThis.pendingTransactionExtraData = params.pendingTransactionExtraData;

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
    oThis.delayedRecoveryModuleMasterCopyAddr = null;
    oThis.createAndAddModulesAddr = null;

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
      }
      logger.error(`${__filename}::perform::catch`);
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 'l_s_e_acw_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: { error: error.toString() }
      });
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

    oThis._initializeVars();

    await oThis._validateMandatoryParams();

    await oThis._setAddresses();

    await oThis._setSessionRelatedVars();

    await oThis._setWeb3Instance();

    const submitTxRsp = await oThis._createCompanyWallet();

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskPending,
        transactionHash: submitTxRsp.data.transactionHash,
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
  _initializeVars() {
    const oThis = this;
    oThis.chainEndpoint = oThis._configStrategyObject.chainRpcProvider(oThis.auxChainId, 'readWrite');
    oThis.gasPrice = contractConstants.auxChainGasPrice;
  }

  /**
   * Validate mandatory parameters.
   *
   * @return {Promise<void>}
   *
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
   * @return {Promise<never>}
   *
   * @private
   */
  async _setAddresses() {
    const oThis = this;

    const tokenAddressesCacheRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    if (tokenAddressesCacheRsp.isFailure() || !tokenAddressesCacheRsp.data) {
      return Promise.reject(tokenAddressesCacheRsp);
    }

    oThis.thMasterCopyAddr = tokenAddressesCacheRsp.data[tokenAddressConstants.tokenHolderMasterCopyContractKind];
    oThis.delayedRecoveryModuleMasterCopyAddr =
      tokenAddressesCacheRsp.data[tokenAddressConstants.delayedRecoveryModuleMasterCopyContractKind];
    oThis.createAndAddModulesAddr = tokenAddressesCacheRsp.data[tokenAddressConstants.createAndAddModulesContractKind];
    oThis.proxyFactoryAddr = tokenAddressesCacheRsp.data[tokenAddressConstants.proxyFactoryContractKind];
    oThis.ownerAddr = tokenAddressesCacheRsp.data[tokenAddressConstants.ownerAddressKind];
    oThis.tokenUserOpsWorkerAddr = tokenAddressesCacheRsp.data[tokenAddressConstants.tokenUserOpsWorkerKind];
    oThis.utilityBrandedTokenAddr = tokenAddressesCacheRsp.data[tokenAddressConstants.utilityBrandedTokenContract];
    oThis.tokenRulesAddr = tokenAddressesCacheRsp.data[tokenAddressConstants.tokenRulesContractKind];

    if (
      !oThis.thMasterCopyAddr ||
      !oThis.delayedRecoveryModuleMasterCopyAddr ||
      !oThis.createAndAddModulesAddr ||
      !oThis.proxyFactoryAddr ||
      !oThis.ownerAddr ||
      !oThis.tokenUserOpsWorkerAddr ||
      !oThis.utilityBrandedTokenAddr ||
      !oThis.tokenRulesAddr
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_acw_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            thMasterCopyAddr: oThis.thMasterCopyAddr,
            delayedRecoveryModuleMasterCopyAddr: oThis.delayedRecoveryModuleMasterCopyAddr,
            createAndAddModulesAddr: oThis.createAndAddModulesAddr,
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
   * Set session related vars dynamically.
   *
   * @return {Promise<never>}
   *
   * @private
   */
  async _setSessionRelatedVars() {
    const oThis = this;

    const tokenCacheResponse = await new TokenCache({ clientId: oThis.clientId }).fetch();

    if (
      tokenCacheResponse.isFailure() ||
      !tokenCacheResponse.data ||
      CommonValidators.isVarNull(tokenCacheResponse.data.conversionFactor)
    ) {
      return Promise.reject(tokenCacheResponse);
    }

    let stakeCurrencyCacheResponse = await new StakeCurrencyByIdCache({
      stakeCurrencyIds: [tokenCacheResponse.data.stakeCurrencyId]
    }).fetch();

    if (stakeCurrencyCacheResponse.isFailure()) {
      return Promise.reject(stakeCurrencyCacheResponse);
    }

    let stakeCurrencyData = stakeCurrencyCacheResponse.data[tokenCacheResponse.data.stakeCurrencyId],
      companyTokenHolderSessionSpendingLimit;

    if (stakeCurrencyData['symbol'] === conversionRatesConstants.OST) {
      companyTokenHolderSessionSpendingLimit = contractConstants.companyTokenHolderSessionSpendingLimitInOstWei;
    } else if (stakeCurrencyData['symbol'] === conversionRatesConstants.USDC) {
      companyTokenHolderSessionSpendingLimit = contractConstants.companyTokenHolderSessionSpendingLimitInUsdcWei;
    } else {
      fail`unsupported stakeCurrencyData symbol ${stakeCurrencyData['symbol']}`;
    }

    const BnConversionFactor = basicHelper.convertToBigNumber(tokenCacheResponse.data.conversionFactor),
      BnSpendingLimit = basicHelper.convertToBigNumber(companyTokenHolderSessionSpendingLimit);

    // Stake currency decimals and BT decimals will be in sync
    const sessionSpendingLimit = basicHelper.formatWeiToString(BnSpendingLimit.mul(BnConversionFactor));

    logger.debug('sessionSpendingLimit--------', sessionSpendingLimit);

    for (let index = 0; index < oThis.sessionKeys.length; index++) {
      oThis.sessionKeysExpirationHeights.push(contractConstants.companyTokenHolderSessionExpirationHeight);
      oThis.sessionKeysSpendingLimits.push(sessionSpendingLimit);
    }
  }

  /**
   * Set Web3 Instance.
   *
   * @return {Promise<void>}
   *
   * @private
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

    const OpenSTJsUserHelper = OpenSTJs.Helpers.User,
      openSTJsUserHelper = new OpenSTJsUserHelper(
        oThis.thMasterCopyAddr,
        null, // GnosisSafeMasterCopy is not required here
        oThis.delayedRecoveryModuleMasterCopyAddr,
        oThis.createAndAddModulesAddr,
        oThis.utilityBrandedTokenAddr,
        oThis.tokenRulesAddr,
        null, // UserWalletFactoryAddress is not required here
        oThis.proxyFactoryAddr,
        oThis.auxWeb3Instance
      );

    // Calculate gas required.
    const baseGas = new BigNumber(contractConstants.addCompanyWalletBaseGas),
      totalSessionKeysGas = new BigNumber(contractConstants.addCompanyWalletPerSessionKeyGas).mul(
        oThis.sessionKeys.length
      ),
      finalGasRequired = baseGas.plus(totalSessionKeysGas);

    const txOptions = {
      from: oThis.tokenUserOpsWorkerAddr,
      to: oThis.proxyFactoryAddr,
      gasPrice: oThis.gasPrice,
      gas: finalGasRequired.toNumber(),
      value: contractConstants.zeroValue
    };

    const txObject = await openSTJsUserHelper._createCompanyWalletRawTx(
      oThis.ownerAddr,
      oThis.sessionKeys,
      oThis.sessionKeysSpendingLimits,
      oThis.sessionKeysExpirationHeights
    );

    txOptions.data = txObject.encodeABI();

    const submitTxRsp = await new SubmitTransaction({
      chainId: oThis.auxChainId,
      tokenId: oThis.tokenId,
      pendingTransactionKind: pendingTransactionConstants.createCompanyWalletKind,
      provider: oThis.chainEndpoint,
      txOptions: txOptions,
      options: oThis.pendingTransactionExtraData
    }).perform();

    if (submitTxRsp && submitTxRsp.isFailure()) {
      return Promise.reject(submitTxRsp);
    }

    return Promise.resolve(submitTxRsp);
  }

  /**
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

    if (oThis.configStrategyObj) {
      return oThis.configStrategyObj;
    }

    oThis.configStrategyObj = new ConfigStrategyObject(oThis._configStrategy);

    return oThis.configStrategyObj;
  }
}

InstanceComposer.registerAsShadowableClass(AddCompanyWallet, coreConstants.icNameSpace, 'AddCompanyWallet');

module.exports = {};
