'use strict';

/**
 *
 * This is base class for branded token deployment
 *
 * @module lib/setup/economy/brandedToken/Base
 *
 */

const rootPrefix = '../../../..',
  TokenModel = require(rootPrefix + '/app/models/mysql/Token'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  gasPriceCacheKlass = require(rootPrefix + '/lib/sharedCacheManagement/EstimateOriginChainGasPrice');

class DeployBrandedTokenBase {
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
  }

  /**
   * async performer
   * @returns {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._initializeVars();

    let deploymentResponse = await oThis._deployContract();

    return Promise.resolve(
      responseHelper.successWithData({
        taskDone: 0,
        transactionHash: deploymentResponse.data['transactionHash']
      })
    );
  }

  /***
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
   *
   * @returns {Promise<any>}
   * @private
   */
  async _fetchAndSetTokenDetails() {
    const oThis = this;

    let tokenDetails = await new TokenModel()
      .select(['id', 'client_id', 'name', 'symbol', 'conversion_factor', 'decimal'])
      .where(['client_id = ?', oThis.clientId])
      .fire();

    if (tokenDetails.length === 0) {
      logger.error('Token details not found');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_es_btb_1',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.tokenId = tokenDetails[0].id;
    oThis.tokenName = tokenDetails[0].name;
    oThis.tokenSymbol = tokenDetails[0].symbol;
    oThis.conversionFactor = tokenDetails[0].conversion_factor;
    oThis.decimal = tokenDetails[0].decimal;
  }

  /**
   *
   * @returns {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;
    oThis.chainEndpoint = oThis._configStrategyObject.chainRpcProvider(oThis.deployChainId, 'readWrite');
    oThis.web3Instance = web3Provider.getInstance(oThis.chainEndpoint).web3WsProvider;
  }

  /**
   * This functions fetches and sets the gas price according to the chain kind passed to it.
   * @param chainKind
   * @returns {Promise<void>}
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

  /***
   *
   * config strategy
   *
   * @return {object}
   */
  get _configStrategy() {
    const oThis = this;
    return oThis.ic().configStrategy;
  }

  /***
   *
   * object of config strategy klass
   *
   * @return {object}
   */
  get _configStrategyObject() {
    const oThis = this;
    if (oThis.configStrategyObj) return oThis.configStrategyObj;
    oThis.configStrategyObj = new ConfigStrategyObject(oThis._configStrategy);
    return oThis.configStrategyObj;
  }
}

module.exports = DeployBrandedTokenBase;
