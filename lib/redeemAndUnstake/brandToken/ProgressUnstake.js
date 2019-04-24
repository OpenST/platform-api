'use strict';
/*
 * This file performs Progress Redeem operation on CoGateway.
 *
 * @module lib/redeemAndUnstake/brandToken/ProgressRedeem
 */

const rootPrefix = '../../..',
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  ProgressUnstakeBase = require(rootPrefix + '/lib/redeemAndUnstake/common/ProgressUnstake');

class ProgressUnstake extends ProgressUnstakeBase {
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
   * Fetch contract addresses involved in transaction
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchContractAddresses() {
    const oThis = this;

    await oThis._fetchGatewayContract();
  }

  /**
   * Fetch Gateway contract address
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchGatewayContract() {
    const oThis = this;

    let tokenAddressesObj = new TokenAddressCache({ tokenId: oThis.tokenId }),
      addressesResp = await tokenAddressesObj.fetch();

    oThis.gatewayContractAddress = addressesResp.data[tokenAddressConstants.tokenGatewayContract];
  }
}

module.exports = ProgressUnstake;
