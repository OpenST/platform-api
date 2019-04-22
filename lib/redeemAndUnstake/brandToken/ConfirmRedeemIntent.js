'use strict';
/*
 * This module helps in confirming redeem intent on Gateway.
 *
 * @module lib/redeemAndUnstake/brandToken/ConfirmRedeemIntent
 */

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  ConfirmRedeemIntentBase = require(rootPrefix + '/lib/redeemAndUnstake/common/ConfirmRedeemIntent');

class ConfirmRedeemIntent extends ConfirmRedeemIntentBase {
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

    let tokenAddressesObj = new TokenAddressCache({ tokenId: oThis.tokenId }),
      addressesResp = await tokenAddressesObj.fetch();

    oThis.gatewayContract = addressesResp.data[tokenAddressConstants.tokenGatewayContract];
    oThis.coGatewayContract = addressesResp.data[tokenAddressConstants.tokenCoGatewayContract];
  }
}

module.exports = ConfirmRedeemIntent;
