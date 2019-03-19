'use strict';
/**
 * Deploy Pricer Rule contract
 *
 * @module lib/setup/economy/DeployPricerRule
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  TokenCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress');

const OpenSTJs = require('@openst/openst.js');

/**
 * Class for Token Holder Master Copy deployment
 *
 * @class
 */
class DeployPricerRule {
  /**
   * Constructor for Token Holder Master Copy deployment
   *
   * @param {Object} params
   * @param {Number} params.tokenId: token id
   * @param {Number} params.clientId: client id
   * @param {String} params.auxChainId: auxChainId for which token rules needs be deployed.
   * @param {String} params.pendingTransactionExtraData: extraData for pending transaction.
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;
    oThis.tokenId = params.tokenId;
    oThis.clientId = params.clientId;
    oThis.auxChainId = params.auxChainId;
    oThis.pendingTransactionExtraData = params.pendingTransactionExtraData;

    oThis.gasPrice = null;
    oThis.chainEndpoint = null;
    oThis.auxWeb3Instance = null;
    oThis.configStrategyObj = null;

    oThis.auxDeployerAddress = null;
    oThis.tokenRulesAddress = null;
    oThis.organizationAddress = null;
    oThis.utilityBTContractAddress = null;
    oThis.conversionFactor = null;

    oThis.responseData = {};
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
          internal_error_identifier: 'l_s_e_dpr_1',
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

    await oThis._fetchAndSetTokenDetails();

    await oThis._setAddresses();

    await oThis._setWeb3Instance();

    let submitTxRsp = await oThis._deployContract();

    return responseHelper.successWithData({
      taskStatus: workflowStepConstants.taskPending,
      transactionHash: submitTxRsp.data['transactionHash'],
      debugParams: oThis.responseData
    });
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
   * Get addresses
   *
   * @private
   *
   * @return {Promise}
   */
  async _setAddresses() {
    const oThis = this;

    // Fetch all addresses associated with given aux chain id.
    let chainAddressCache = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressCacheRsp = await chainAddressCache.fetch();

    if (chainAddressCacheRsp.isFailure() || !chainAddressCacheRsp.data) {
      return Promise.reject(chainAddressCacheRsp);
    }

    oThis.auxDeployerAddress = chainAddressCacheRsp.data[chainAddressConstants.auxDeployerKind].address;

    let getAddrRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    if (getAddrRsp.isFailure() || !getAddrRsp.data) {
      return Promise.reject(getAddrRsp);
    }

    oThis.tokenRulesAddress = getAddrRsp.data[tokenAddressConstants.tokenRulesContractKind];
    oThis.organizationAddress = getAddrRsp.data[tokenAddressConstants.auxOrganizationContract];
    oThis.utilityBTContractAddress = getAddrRsp.data[tokenAddressConstants.utilityBrandedTokenContract];

    if (
      !oThis.auxDeployerAddress ||
      !oThis.tokenRulesAddress ||
      !oThis.organizationAddress ||
      !oThis.utilityBTContractAddress
    ) {
      logger.error('Could not fetched token details.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_dpr_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            utilityBTContractAddress: oThis.utilityBTContractAddress,
            tokenRulesAddress: oThis.tokenRulesAddress,
            organizationAddress: oThis.organizationAddress,
            auxDeployerAddress: oThis.auxDeployerAddress
          }
        })
      );
    }

    oThis.responseData = {
      utilityBTContractAddress: oThis.utilityBTContractAddress,
      tokenRulesAddress: oThis.tokenRulesAddress,
      organizationAddress: oThis.organizationAddress,
      auxDeployerAddress: oThis.auxDeployerAddress
    };
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
   * Fetch and set token details.
   *
   * @returns {Promise<any>}
   *
   * @private
   */
  async _fetchAndSetTokenDetails() {
    const oThis = this;

    let cacheResponse = await new TokenCache({ clientId: oThis.clientId }).fetch();

    if (cacheResponse.isFailure() || !cacheResponse.data || !cacheResponse.data.conversionFactor) {
      logger.error('Could not fetched token details.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_dpr_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            clientId: oThis.clientId
          }
        })
      );
    }

    oThis.conversionFactor = cacheResponse.data.conversionFactor;

    oThis.responseData.conversionFactor = oThis.conversionFactor;
  }

  /**
   * Deploy contract
   *
   * @returns {Promise<*>}
   *
   * @private
   */
  async _deployContract() {
    const oThis = this;

    let OpenSTJsRulesSetup = OpenSTJs.Setup.Rules,
      openSTJsRulesSetup = new OpenSTJsRulesSetup(
        oThis.auxWeb3Instance,
        oThis.organizationAddress,
        oThis.utilityBTContractAddress,
        oThis.tokenRulesAddress
      );

    let txOptions = {
      from: oThis.auxDeployerAddress,
      gasPrice: oThis.gasPrice,
      gas: contractConstants.deployPricerRuleGas,
      value: contractConstants.zeroValue
    };

    let conversionRateForContract = basicHelper.computeConversionRateForContract(oThis.conversionFactor);

    let txObject = await openSTJsRulesSetup._deployPricerRuleRawTx(
      contractConstants.ostBaseCurrencyCode,
      conversionRateForContract,
      coreConstants.CONVERSION_RATE_DECIMALS,
      contractConstants.requiredPriceOracleDecimals
    );

    Object.assign(oThis.responseData, {
      ostBaseCurrencyCode: contractConstants.ostBaseCurrencyCode,
      conversionRateForContract: conversionRateForContract,
      conversionRateDecimals: coreConstants.CONVERSION_RATE_DECIMALS,
      requiredPriceOracleDecimals: contractConstants.requiredPriceOracleDecimals
    });

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

    return submitTxRsp;
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

InstanceComposer.registerAsShadowableClass(DeployPricerRule, coreConstants.icNameSpace, 'DeployPricerRule');

module.exports = {};
