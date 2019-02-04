'use strict';

const rootPrefix = '../../..',
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  ProveGatewayBase = require(rootPrefix + '/lib/stakeAndMint/common/ProveGatewayBase');

class ProveGatewayForBt extends ProveGatewayBase {
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
   * Fetch gateway addresses
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchGatewayAddresses() {
    const oThis = this;

    let tokenAddressesObj = new TokenAddressCache({ tokenId: oThis.tokenId }),
      addressesResp = await tokenAddressesObj.fetch();

    oThis.gatewayContract = addressesResp.data[tokenAddressConstants.tokenGatewayContract];
    oThis.coGatewayContract = addressesResp.data[tokenAddressConstants.tokenCoGatewayContract];
  }
}

module.exports = ProveGatewayForBt;
