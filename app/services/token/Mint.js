'use strict';

/**
 * This service gets the simple token contract address and origin chain gas price
 *
 * @module app/services/token/Mint
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ChainAddressesCache = require(rootPrefix + '/lib/sharedCacheManagement/ChainAddresses'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  chainAddressConst = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  gasPriceCacheKlass = require(rootPrefix + '/lib/sharedCacheManagement/EstimateOriginChainGasPrice');

class Mint {
  constructor() {
    const oThis = this;

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
        logger.error('app/services/token/Mint::perform::catch');
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

    await oThis.getSimpleTokenContractAddress();

    await oThis.getOriginChainGasPrice();

    return responseHelper.successWithData(oThis.responseData);
  }

  /**
   * This function fetches simple token contract address and sets in response data hash.
   *
   * @returns {Promise<*>}
   */
  async getSimpleTokenContractAddress() {
    const oThis = this;

    //fetch origin chainId
    let csHelper = new ConfigStrategyHelper(0),
      csResponse = await csHelper.getForKind(configStrategyConstants.constants),
      configConstants = csResponse.data[configStrategyConstants.constants],
      originChainId = configConstants.originChainId;

    //fetch all addresses associated with origin chain id
    let chainAddressCacheObj = new ChainAddressesCache({ chainId: originChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_t_m_1',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.responseData['simple_token_contract_address'] =
      chainAddressesRsp.data[originChainId][chainAddressConst.baseContractKind];
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

    oThis.responseData['origin_chain_gas_price'] = gasPriceRsp.data;
  }
}

module.exports = Mint;

InstanceComposer.registerAsShadowableClass(Mint, coreConstants.icNameSpace, 'StartMint');
