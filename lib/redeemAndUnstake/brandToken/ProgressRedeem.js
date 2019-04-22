'use strict';
/*
 * This file performs Progress Redeem operation on CoGateway.
 *
 * @module lib/redeemAndUnstake/brandToken/ProgressRedeem
 */

const rootPrefix = '../../..',
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  ProgressRedeemBase = require(rootPrefix + '/lib/redeemAndUnstake/common/ProgressRedeem');

class ProgressRedeem extends ProgressRedeemBase {
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

    await oThis._fetchCoGatewayContract();
  }

  /**
   * Fetch CoGateway contract address
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchCoGatewayContract() {
    const oThis = this;

    let tokenAddressesObj = new TokenAddressCache({ tokenId: oThis.tokenId }),
      addressesResp = await tokenAddressesObj.fetch();
    oThis.coGatewayContractAddress = addressesResp.data[tokenAddressConstants.tokenCoGatewayContract];
  }
}

module.exports = ProgressRedeem;
