'use strict';

/**
 * activate gateway contract
 *
 * @module lib/setup/economy/ActivateGateway
 */

const rootPrefix = '../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  SignerWeb3Provider = require(rootPrefix + '/lib/providers/signerWeb3'),
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  transferAmount = require(rootPrefix + '/tools/helpers/TransferAmountOnChain'),
  TokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  ActivateGatewayHelper = require(rootPrefix + '/lib/setup/common/ActivateGateway'),
  gasPriceCacheKlass = require(rootPrefix + '/lib/sharedCacheManagement/EstimateOriginChainGasPrice');

/**
 *
 * @class
 */
class ActivateTokenGateway {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {String} params.auxChainId - auxChainId for which origin-gateway needs be deployed.
   * @param {String} params.tokenId
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params['auxChainId'];
    oThis.tokenId = params.tokenId;
    oThis.tokenAddressKindMap = {};

    oThis.SignerWeb3Instance = null;
    oThis.web3Instance = null;

    oThis.deployChainId = null;
    oThis.gasPrice = null;
    oThis.configStrategyObj = null;
  }

  /**
   *
   * Perform
   *
   * @return {Promise<result>}
   *
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
          internal_error_identifier: 't_es_ag_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /***
   *
   * @private
   *
   * @return {Promise<result>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._initializeVars();

    await oThis._getTokenAddresses();

    let signerAddress = await oThis._getAddressesForTokens(TokenAddressConstants.ownerAddressKind),
      gatewayContractAddress = await oThis._getAddressesForTokens(TokenAddressConstants.tokenGatewayContract),
      coGatewayContractAddress = await oThis._getAddressesForTokens(TokenAddressConstants.tokenCoGatewayContract);

    await oThis._setWeb3Instance(signerAddress);

    await oThis._fundAddress(signerAddress);

    let params = {
      chainId: oThis.deployChainId,
      signerAddress: signerAddress,
      chainEndpoint: oThis._configStrategyObject.chainRpcProvider(oThis.deployChainId, 'readWrite'),
      gasPrice: oThis.gasPrice,
      gatewayAddress: gatewayContractAddress,
      coGatewayAddress: coGatewayContractAddress
    };

    let helper = new ActivateGatewayHelper(params);

    let activateRsp = await helper.perform();

    logger.info('Gateway Activation Response:', activateRsp);

    activateRsp.debugOptions = {
      inputParams: {},
      processedParams: params
    };

    return Promise.resolve(
      responseHelper.successWithData({
        taskDone: 1,
        taskResponseData: {}
      })
    );
  }

  /***
   *
   * init vars
   *
   * @private
   */
  async _initializeVars() {
    const oThis = this;
    oThis.deployChainId = oThis._configStrategyObject.originChainId;
    oThis.chainKind = coreConstants.originChainKind;

    let gasPriceCacheObj = new gasPriceCacheKlass(),
      gasPriceRsp = await gasPriceCacheObj.fetch();
    oThis.gasPrice = gasPriceRsp.data;
  }

  /**
   * Get address of various kinds.
   *
   * @returns {Promise<>}
   * @private
   * @sets addressKindMap
   */
  async _getTokenAddresses() {
    const oThis = this;
    console.log('oThis.tokenId', oThis.tokenId);
    let addresses = await new TokenAddressModel()
      .select('*')
      .where([
        'token_id = ? AND kind in (?)',
        oThis.tokenId,
        [
          new TokenAddressModel().invertedKinds[TokenAddressConstants.ownerAddressKind],
          new TokenAddressModel().invertedKinds[TokenAddressConstants.tokenGatewayContract],
          new TokenAddressModel().invertedKinds[TokenAddressConstants.tokenCoGatewayContract]
        ]
      ])
      .order_by('id DESC')
      .fire();

    for (let i = 0; i < addresses.length; i++) {
      let addressData = addresses[i],
        addressKind = new TokenAddressModel().kinds[addressData.kind];
      oThis.tokenAddressKindMap[addressKind] = oThis.tokenAddressKindMap[addressKind] || [];
      oThis.tokenAddressKindMap[addressKind].push(addressData.address);
    }
  }

  /**
   * _setWeb3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setWeb3Instance(address) {
    const oThis = this;

    let wsProvider = oThis._configStrategyObject.chainWsProvider(oThis.deployChainId, 'readWrite');

    oThis.SignerWeb3Instance = new SignerWeb3Provider(wsProvider, address);
    oThis.web3Instance = await oThis.SignerWeb3Instance.getInstance();
  }

  /**
   *
   * @param addressKind {string} address got given kind
   *
   * @returns {string} one address for unique kinds, and array for multiple possible kinds.
   * @private
   */
  _getAddressesForTokens(addressKind) {
    const oThis = this;

    if (TokenAddressConstants.uniqueKinds.indexOf(addressKind) > -1) {
      return oThis.tokenAddressKindMap[addressKind][0];
    } else {
      return oThis.tokenAddressKindMap[addressKind];
    }
  }

  async _fundAddress(address) {
    const oThis = this;

    let amountInWei = '100000000000000000000';
    await transferAmount._fundAddressWithEth(address, oThis.deployChainId, oThis.web3Instance, amountInWei);

    logger.info('Gas transferred to Organization Owner address: ', address);
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

InstanceComposer.registerAsShadowableClass(ActivateTokenGateway, coreConstants.icNameSpace, 'ActivateTokenGateway');

module.exports = ActivateTokenGateway;
