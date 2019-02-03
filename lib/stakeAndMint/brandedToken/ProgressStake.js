'use strict';

const rootPrefix = '../../..',
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  ProgressStakeBase = require(rootPrefix + '/lib/stakeAndMint/common/ProgressStakeBase'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress');

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
}

module.exports = ProgressStakeForBt;
