/**
 * Module to confirm redeem intent on gateway.
 *
 * @module lib/redeemAndUnstake/brandToken/ConfirmRedeemIntent
 */

const rootPrefix = '../../..',
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  ConfirmRedeemIntentBase = require(rootPrefix + '/lib/redeemAndUnstake/common/ConfirmRedeemIntent'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress');

/**
 * Class to confirm redeem intent on gateway.
 *
 * @class ConfirmRedeemIntent
 */
class ConfirmRedeemIntent extends ConfirmRedeemIntentBase {
  /**
   * Constructor to confirm redeem intent on gateway.
   *
   * @param {object} params
   * @param {object} params.payloadDetails
   * @param {number} params.originChainId
   * @param {number} params.auxChainId
   * @param {string} params.redeemerAddress
   * @param {number} params.amountToRedeem
   * @param {string} params.beneficiary
   * @param {string} params.facilitator
   * @param {string} params.messageHash
   * @param {string} params.redeemerNonce
   * @param {string} params.amountRedeemed
   * @param {string} params.secretString
   * @param {string} params.storageProof
   * @param {string} params.proveCoGatewayBlockNumber
   * @param {number} params.tokenId
   *
   * @augments ConfirmRedeemIntentBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenId = params.tokenId;
  }

  /**
   * Fetch contract addresses involved in transaction.
   *
   * @sets oThis.gatewayContract, oThis.coGatewayContract
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchContractAddresses() {
    const oThis = this;

    const tokenAddressesObj = new TokenAddressCache({ tokenId: oThis.tokenId }),
      addressesResp = await tokenAddressesObj.fetch();

    oThis.gatewayContract = addressesResp.data[tokenAddressConstants.tokenGatewayContract];
    oThis.coGatewayContract = addressesResp.data[tokenAddressConstants.tokenCoGatewayContract];
  }
}

module.exports = ConfirmRedeemIntent;
