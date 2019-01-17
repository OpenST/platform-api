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
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  transferAmount = require(rootPrefix + '/tools/helpers/TransferAmountOnChain'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/sharedCacheManagement/TokenAddress'),
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
    oThis.pendingTransactionExtraData = params['pendingTransactionExtraData'];

    oThis.web3Instance = null;

    oThis.deployChainId = null;
    oThis.gasPrice = null;
    oThis.configStrategyObj = null;
    oThis.tokenCoGatewayAddresses = null;
    oThis.tokenGatewayAddress = null;
    oThis.ownerAddress = null;
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

    await oThis._setAddresses();

    let signerAddress = oThis.ownerAddress;

    await oThis._setWeb3Instance();

    await oThis._fundAddress(signerAddress); //TODO: This fund shouldn't he here as owner should already have ETH

    let params = {
      chainId: oThis.deployChainId,
      signerAddress: signerAddress,
      chainEndpoint: oThis.chainEndpoint,
      gasPrice: oThis.gasPrice,
      gatewayAddress: oThis.tokenGatewayAddress,
      coGatewayAddress: oThis.tokenCoGatewayAddresses,
      pendingTransactionExtraData: oThis.pendingTransactionExtraData
    };

    let helper = new ActivateGatewayHelper(params);

    let activateRsp = await helper.perform();

    return Promise.resolve(
      responseHelper.successWithData({
        taskDone: 0,
        transactionHash: activateRsp.data['transactionHash'],
        taskResponseData: params
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
    oThis.chainEndpoint = oThis._configStrategyObject.chainWsProvider(oThis.deployChainId, 'readWrite');
    let gasPriceCacheObj = new gasPriceCacheKlass(),
      gasPriceRsp = await gasPriceCacheObj.fetch();
    oThis.gasPrice = gasPriceRsp.data;
  }

  /***
   *
   * @private
   */
  async _setAddresses() {
    const oThis = this;

    let getAddrRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    oThis.ownerAddress = getAddrRsp.data[tokenAddressConstants.ownerAddressKind];
    oThis.tokenGatewayAddress = getAddrRsp.data[tokenAddressConstants.tokenGatewayContract];
    oThis.tokenCoGatewayAddresses = getAddrRsp.data[tokenAddressConstants.tokenCoGatewayContract];

    if (!oThis.ownerAddress || !oThis.tokenGatewayAddress || !oThis.tokenCoGatewayAddresses) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_es_ag_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            ownerAddress: oThis.ownerAddress,
            tokenCoGatewayAddresses: oThis.tokenCoGatewayAddresses,
            tokenGatewayAddress: oThis.tokenGatewayAddress
          }
        })
      );
    }
  }

  /**
   * _setWeb3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;
    oThis.web3Instance = await web3Provider.getInstance(oThis.chainEndpoint).web3WsProvider;
  }

  async _fundAddress(address) {
    const oThis = this;

    let amountInWei = '100000000000000000000';
    await transferAmount._fundAddressWithEth(address, oThis.deployChainId, oThis.chainEndpoint, amountInWei);

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
