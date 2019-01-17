'use strict';
/**
 * This module creates entry for new economy in dynamo db.
 *
 * @module app/services/token/SyncInView
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  CreateEconomy = require(rootPrefix + '/tools/economySetup/CreateEconomy'),
  TokenAddressCache = require(rootPrefix + '/lib/sharedCacheManagement/TokenAddress'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress');

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
   *
   * @constructor
   */

  constructor(params) {
    const oThis = this;
    oThis.tokenId = params.tokenId;
    oThis.chainId = params.chainId;
  }

  /**
   * Create entry in economy table in DynamoDB.
   *
   * @return {Promise<*>}
   */
  async perform() {
    const oThis = this;

    await oThis._setAddresses();

    let chainEndPoint = await oThis._getRpcProvider(),
      params = {
        tokenId: oThis.tokenId,
        chainId: oThis.chainId,
        simpleStakeAddress: oThis.simpleStakeAddress,
        brandedTokenContract: oThis.brandedTokenAddress,
        chainEndpoint: chainEndPoint[0]
      };

    let createEconomy = new CreateEconomy(params);

    await createEconomy.perform();
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

    oThis.simpleStakeAddress = getAddrRsp.data[tokenAddressConstants.simpleStakeContract];
    oThis.brandedTokenAddress = getAddrRsp.data[tokenAddressConstants.brandedTokenContract];

    if (!oThis.simpleStakeAddress || !oThis.brandedTokenAddress) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_es_siv_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            simpleStakeAddress: oThis.simpleStakeAddress,
            brandedTokenAddress: oThis.brandedTokenAddress
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

module.exports = SyncInView;
