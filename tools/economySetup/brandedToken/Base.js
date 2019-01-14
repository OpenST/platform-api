'use strict';

/**
 *
 * This is base class for branded token deployment
 *
 * @module tools/economySetup/brandedToken/Base
 *
 */

const rootPrefix = '../../..',
  NonceManager = require(rootPrefix + '/lib/nonce/Manager'),
  TokenModel = require(rootPrefix + '/app/models/mysql/Token'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  SignerWeb3Provider = require(rootPrefix + '/lib/providers/signerWeb3'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  TokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  gasPriceCacheKlass = require(rootPrefix + '/lib/sharedCacheManagement/EstimateOriginChainGasPrice');

class DeployBrandedTokenBase {
  constructor(params) {
    const oThis = this;

    console.log('---------------params--', params);

    oThis.clientId = params.clientId;
    oThis.auxChainId = params.chainId;

    oThis.simpleTokenAddress = null;
    oThis.deployerAddress = null;
    oThis.gasPrice = null;
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
   * sets the deployer address
   *
   * @param chainId
   * @returns {Promise<*>}
   * @private
   */
  async _fetchAndSetDeployerAddress() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.deployChainId,
      kind: chainAddressConstants.deployerKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_es_btb_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.deployerAddress = fetchAddrRsp.data.address;
  }

  /**
   * sets the simple token address as per the chain id passed.
   *
   * @param chainId
   * @returns {Promise<*>}
   * @private
   */
  async _fetchAndSetSimpleTokenAddress() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.deployChainId,
      kind: chainAddressConstants.baseContractKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_es_btb_3',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.simpleTokenAddress = fetchAddrRsp.data.address;
  }

  /**
   *
   * @returns {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    let wsProvider = oThis._configStrategyObject.chainWsProvider(oThis.deployChainId, 'readWrite');

    oThis.SignerWeb3Instance = new SignerWeb3Provider(wsProvider, oThis.deployerAddress);
    oThis.web3Instance = await oThis.SignerWeb3Instance.getInstance();
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
        // TODO :: Gasprice should not be 0 hardcoded.
        oThis.gasPrice = '0x0';
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

  /**
   *
   * @param organizationContractAddress
   * @returns {Promise<>}
   * @private
   */
  async _insertIntoTokenAddresses(contractAddress) {
    const oThis = this;
    let contractKind = oThis._contractKind();

    await new TokenAddressModel()
      .insert({
        token_id: oThis.tokenId,
        kind: contractKind,
        address: contractAddress
      })
      .fire();
  }

  /**
   *
   * @returns {*}
   * @private
   */
  _contractKind() {
    const oThis = this;
    if (oThis.deployToChainKind == coreConstants.originChainKind) {
      return new TokenAddressModel().invertedKinds[TokenAddressConstants.brandedTokenContract];
    } else {
      return new TokenAddressModel().invertedKinds[TokenAddressConstants.utilityBrandedTokenContract];
    }
  }

  /**
   * fetch nonce (calling this method means incrementing nonce in cache, use judiciously)
   *
   * @ignore
   *
   * @return {Promise}
   */
  async _fetchNonce() {
    const oThis = this;
    return new NonceManager({
      address: oThis.deployerAddress,
      chainId: oThis.deployChainId
    }).getNonce();
  }
}

module.exports = DeployBrandedTokenBase;
