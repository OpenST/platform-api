'use strict';
/**
 * This is base class for branded token deployment
 *
 * @module lib/setup/economy/brandedToken/Base
 */
const rootPrefix = '../../../..',
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  TokenCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  gasPriceCacheKlass = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice');

/**
 * Base class to deploy branded token.
 *
 * @class
 */
class DeployBrandedTokenBase {
  /**
   * Constructor for base class to deploy branded token
   *
   * @param {Object} params
   * @param {Number} params.clientId
   * @param {Number} params.chainId
   * @param {Object} params.pendingTransactionExtraData
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.clientId = params.clientId;
    oThis.auxChainId = params.chainId;
    oThis.pendingTransactionExtraData = params['pendingTransactionExtraData'];

    oThis.web3Instance = null;
    oThis.simpleTokenAddress = null;
    oThis.deployerAddress = null;
    oThis.gasPrice = null;
    oThis.chainEndpoint = null;
    oThis.taskResponseData = null;
  }

  /**
   * Async performer
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._initializeVars();

    let deploymentResponse = await oThis._deployContract();

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskPending,
        transactionHash: deploymentResponse.data['transactionHash'],
        taskResponseData: oThis.taskResponseData
      })
    );
  }

  /**
   * Fetch necessary addresses
   *
   * @param {Number} chainId
   * @param {Array} kinds
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchAddresses(chainId, kinds) {
    const oThis = this,
      chainAddress = new ChainAddressModel();

    return await chainAddress.fetchAddresses({
      chainId: chainId,
      kinds: kinds
    });
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

    if (cacheResponse.isFailure()) {
      logger.error('Could not fetched token details.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_t_d_7',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            clientId: oThis.clientId
          }
        })
      );
    }

    let tokenDetails = cacheResponse.data;

    oThis.tokenId = tokenDetails.id;
    oThis.tokenName = tokenDetails.name;
    oThis.tokenSymbol = tokenDetails.symbol;
    oThis.conversionFactor = tokenDetails.conversionFactor;
    oThis.decimal = tokenDetails.decimal;
  }

  /**
   * Set web3 instance.
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    oThis.chainEndpoint = oThis._configStrategyObject.chainRpcProvider(oThis.deployChainId, 'readWrite');
    oThis.web3Instance = web3Provider.getInstance(oThis.chainEndpoint).web3WsProvider;
  }

  /**
   * This functions fetches and sets the gas price according to the chain kind passed to it.
   *
   * @param {String} chainKind
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _fetchAndSetGasPrice(chainKind) {
    const oThis = this;

    switch (chainKind) {
      case coreConstants.originChainKind:
        let gasPriceCacheObj = new gasPriceCacheKlass(),
          gasPriceRsp = await gasPriceCacheObj.fetch();

        oThis.gasPrice = gasPriceRsp.data;
        break;
      case coreConstants.auxChainKind:
        oThis.gasPrice = contractConstants.auxChainGasPrice;
        break;
      default:
        throw `unsupported chainKind: ${chainKind}`;
    }
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

    if (oThis.configStrategyObj) return oThis.configStrategyObj;

    oThis.configStrategyObj = new ConfigStrategyObject(oThis._configStrategy);

    return oThis.configStrategyObj;
  }
}

module.exports = DeployBrandedTokenBase;
