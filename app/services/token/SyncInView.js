'use strict';
/**
 * This module creates entry for new economy in dynamo db.
 *
 * @module app/services/token/SyncInView
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CreateInView = require(rootPrefix + '/lib/setup/economy/CreateInView'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress');

/**
 * Class for SyncInView
 *
 * @class
 */
class SyncInView {
  /**
   * Constructor
   *
   * @param params
   * @param {Integer} params.tokenId - Id of token table
   * @param {Integer} params.chainId
   * @param {Integer} params.clientId
   * @param {Integer} params.stakeCurrencyContractAddress
   *
   * @constructor
   */

  constructor(params) {
    const oThis = this;
    oThis.tokenId = params.tokenId;
    oThis.chainId = params.chainId;
    oThis.clientId = params.clientId;
    oThis.stakeCurrencyContractAddress = params.stakeCurrencyContractAddress;
  }

  /**
   * Create entry in economy table in DynamoDB.
   *
   * @return {Promise<*>}
   */
  async perform() {
    const oThis = this;

    await oThis._setAddresses();

    let chainEndPoint = await oThis._getRpcProvider();

    let createInView = new CreateInView({
      tokenId: oThis.tokenId,
      chainId: oThis.chainId,
      clientId: oThis.clientId,
      gatewayContractAddress: oThis.gatewayContractAddress,
      brandedTokenContract: oThis.brandedTokenAddress,
      utilityBrandedTokenContract: oThis.utilityBrandedTokenAddress,
      stakeCurrencyContractAddress: oThis.stakeCurrencyContractAddress,
      chainEndpoint: chainEndPoint[0]
    });

    await createInView.perform();

    return responseHelper.successWithData({
      taskStatus: workflowStepConstants.taskDone,
      debugParams: {
        gatewayContractAddress: oThis.gatewayContractAddress,
        brandedTokenContract: oThis.brandedTokenAddress,
        utilityBrandedTokenContract: oThis.utilityBrandedTokenAddress,
        stakeCurrencyContractAddress: oThis.stakeCurrencyContractAddress,
        chainEndpoint: chainEndPoint[0]
      }
    });
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

    oThis.gatewayContractAddress = getAddrRsp.data[tokenAddressConstants.tokenGatewayContract];
    oThis.brandedTokenAddress = getAddrRsp.data[tokenAddressConstants.brandedTokenContract];
    oThis.utilityBrandedTokenAddress = getAddrRsp.data[tokenAddressConstants.utilityBrandedTokenContract];

    if (!oThis.gatewayContractAddress || !oThis.brandedTokenAddress || !oThis.utilityBrandedTokenAddress) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_es_siv_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            gatewayContractAddress: oThis.gatewayContractAddress,
            brandedTokenAddress: oThis.brandedTokenAddress,
            utilityBrandedTokenAddress: oThis.utilityBrandedTokenAddress
          }
        })
      );
    }
  }

  /**
   * Get rpc provider
   *
   * @return {Object}
   */
  async _getRpcProvider() {
    const oThis = this;
    const configStrategyObj = new ConfigStrategyObject(oThis.ic().configStrategy);
    return configStrategyObj.chainRpcProviders(oThis.chainId, 'readWrite');
  }
}

InstanceComposer.registerAsShadowableClass(SyncInView, coreConstants.icNameSpace, 'SyncInView');

module.exports = {};
