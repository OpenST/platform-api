'use strict';

const rootPrefix = '../../..',
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  ProgressStakeBase = require(rootPrefix + '/lib/stakeAndMint/common/ProgressStakeBase'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  DynamicGasPriceCache = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice');

class ProgressStakeForBt extends ProgressStakeBase {
  /**
   * @constructor
   *
   * @param params
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenId = params.tokenId;
  }

  /**
   * Fetch gateway contract
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchGatewayContract() {
    const oThis = this;

    let tokenAddressesObj = new TokenAddressCache({ tokenId: oThis.tokenId }),
      addressesResp = await tokenAddressesObj.fetch();

    oThis.gatewayContract = addressesResp.data[tokenAddressConstants.tokenGatewayContract];
  }

  /**
   * Get origin chain dynamic gas price
   *
   * @return {Promise<*>}
   * @private
   */
  async _fetchGasPrice() {
    const oThis = this;

    let dynamicGasPriceResponse = await new DynamicGasPriceCache().fetch();

    return dynamicGasPriceResponse.data;
  }
}

module.exports = ProgressStakeForBt;
