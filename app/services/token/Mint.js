'use strict';

/**
 * This service gets the simple token contract address and origin chain gas price
 *
 * @module app/services/token/Mint
 */

const rootPrefix = '../../..',
  BigNumber = require('bignumber.js'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  TokenCache = require(rootPrefix + '/lib/kitSaasSharedCacheManagement/Token'),
  OriginChainAddressesCache = require(rootPrefix + '/lib/cacheManagement/shared/OriginChainAddresses'),
  chainAddressConst = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  gasPriceCacheKlass = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice');

class TokenMintDetails {
  constructor(params) {
    const oThis = this;
    oThis.clientId = params.client_id;

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

    await oThis.calculateMinimumEthRequired();

    await oThis.calculateMinimumOstRequired();

    return responseHelper.successWithData(oThis.responseData);
  }

  /**
   * This function fetches simple token contract address and sets in response data hash.
   *
   * @returns {Promise<*>}
   */
  async getSimpleTokenContractAddress() {
    const oThis = this;

    // Fetch all addresses associated with origin chain id
    let chainAddressCacheObj = new OriginChainAddressesCache(),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_t_m_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.responseData['contract_address'] = {
      simple_token: { address: chainAddressesRsp.data[chainAddressConst.baseContractKind] }
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

  async calculateMinimumEthRequired() {
    const oThis = this;

    let averageGasUsedForMintBN = new BigNumber(coreConstants.GAS_USED_FOR_MINT),
      gasPriceBN = new BigNumber(coreConstants.MAX_VALUE_GAS_PRICE),
      minimumEthRequired = averageGasUsedForMintBN.mul(gasPriceBN),
      bufferAmount = minimumEthRequired.div(2);

    minimumEthRequired = minimumEthRequired.add(bufferAmount);

    oThis.responseData['minimum_eth_required'] = minimumEthRequired.toString(10);
  }

  async calculateMinimumOstRequired() {
    const oThis = this;

    let tokenCacheObj = new TokenCache({ clientId: oThis.clientId }),
      tokenData = await tokenCacheObj.fetch();

    if (tokenData.isFailure()) {
      logger.error('Token data not found!!');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_t_m_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: { client_id: oThis.clientId }
        })
      );
    }

    // (1/conversion_factor) * 10^18
    let conversionFactor = tokenData.data.conversionFactor,
      decimal = tokenData.data.decimal,
      conversionFactorBN = new BigNumber(conversionFactor),
      oneAsBigNumber = new BigNumber('1'),
      tenAsBigNumber = new BigNumber('10'),
      minimumOstRequiredBN = oneAsBigNumber.div(conversionFactorBN),
      minimumOstRequiredInWei = minimumOstRequiredBN.mul(tenAsBigNumber.toPower(decimal));

    oThis.responseData['minimum_ost_required'] = minimumOstRequiredInWei.toString(10);
  }
}

module.exports = TokenMintDetails;
