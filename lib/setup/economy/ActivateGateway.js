'use strict';
/**
 * Activate gateway contract
 *
 * @module lib/setup/economy/ActivateGateway
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  ActivateGatewayHelper = require(rootPrefix + '/lib/setup/common/ActivateGateway'),
  TokenAddressCache = require(rootPrefix + '/lib/kitSaasSharedCacheManagement/TokenAddress'),
  gasPriceCacheKlass = require(rootPrefix + '/lib/sharedCacheManagement/EstimateOriginChainGasPrice');

/**
 * Class to activate gateway contract.
 *
 * @class
 */
class ActivateTokenGateway {
  /**
   * Constructor to activate gateway contract.
   *
   * @param {Object} params
   * @param {String} params.auxChainId: auxChainId for which origin-gateway needs be deployed.
   * @param {String} params.tokenId
   *
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
    oThis.adminAddress = null;
  }

  /**
   * Perform
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
          internal_error_identifier: 'l_s_e_ac_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
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

    await oThis._setAddresses();

    let signerAddress = oThis.adminAddress;

    await oThis._setWeb3Instance();

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
        taskStatus: workflowStepConstants.taskPending,
        transactionHash: activateRsp.data['transactionHash'],
        taskResponseData: params
      })
    );
  }

  /**
   * Initialize variables.
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

  /**
   * Set addresses
   *
   * @private
   */
  async _setAddresses() {
    const oThis = this;

    let getAddrRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    oThis.adminAddress = getAddrRsp.data[tokenAddressConstants.originAdminAddressKind];
    oThis.tokenGatewayAddress = getAddrRsp.data[tokenAddressConstants.tokenGatewayContract];
    oThis.tokenCoGatewayAddresses = getAddrRsp.data[tokenAddressConstants.tokenCoGatewayContract];

    if (!oThis.adminAddress || !oThis.tokenGatewayAddress || !oThis.tokenCoGatewayAddresses) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_ac_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            adminAddress: oThis.adminAddress,
            tokenCoGatewayAddresses: oThis.tokenCoGatewayAddresses,
            tokenGatewayAddress: oThis.tokenGatewayAddress
          }
        })
      );
    }
  }

  /**
   * Set web3 instance.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    oThis.web3Instance = await web3Provider.getInstance(oThis.chainEndpoint).web3WsProvider;
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

InstanceComposer.registerAsShadowableClass(ActivateTokenGateway, coreConstants.icNameSpace, 'ActivateTokenGateway');

module.exports = ActivateTokenGateway;
