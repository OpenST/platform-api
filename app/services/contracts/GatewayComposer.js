'use strict';

/**
 * This service gets the gateway composer contract address and origin chain gas price
 *
 * @module app/services/contracts/GatewayComposer
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  gasPriceCacheKlass = require(rootPrefix + '/lib/sharedCacheManagement/EstimateOriginChainGasPrice');

require(rootPrefix + '/lib/cacheManagement/StakerWhitelistedAddress');

class GatewayComposer {
  constructor(params) {
    const oThis = this;

    oThis.tokenId = params.token_id;
    oThis.stakerAddress = params.staker_address;

    oThis.responseData = {};
  }

  /**
   * perform
   * @return {Promise<>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('app/services/contracts/GatewayComposer::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'a_s_t_m_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * asyncPerform
   *
   * @return {Promise<any>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis.getGatewayComposerContractAddress();

    await oThis.getOriginChainGasPrice();

    return responseHelper.successWithData(oThis.responseData);
  }

  /**
   * This function fetches simple token contract address and sets in response data hash.
   *
   * @returns {Promise<*>}
   */
  async getGatewayComposerContractAddress() {
    const oThis = this;

    //
    let stakerWhitelistedCacheKlass = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'StakerWhitelistedAddressCache'),
      stakerWhitelistedCacheObj = new stakerWhitelistedCacheKlass({
        tokenId: oThis.tokenId,
        address: oThis.stakerAddress
      }),
      stakerWhitelistedAddrRsp = await stakerWhitelistedCacheObj.fetch();

    if (stakerWhitelistedAddrRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_c_gc_1',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.responseData['contract_address'] = {
      gateway_composer: { address: stakerWhitelistedAddrRsp.data.gatewayComposerAddress }
    };
  }

  /**
   * This function fetches origin chain gas price and sets in response data hash.
   *
   * @returns {Promise<*>}
   */
  async getOriginChainGasPrice() {
    const oThis = this;

    let gasPriceCacheObj = new gasPriceCacheKlass(),
      gasPriceRsp = await gasPriceCacheObj.fetch();

    oThis.responseData['gas_price'] = { origin: gasPriceRsp.data };
  }
}

module.exports = GatewayComposer;

InstanceComposer.registerAsShadowableClass(GatewayComposer, coreConstants.icNameSpace, 'GatewayComposer');
