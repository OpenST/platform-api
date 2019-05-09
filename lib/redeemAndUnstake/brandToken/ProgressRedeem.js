/**
 * Module to perform Progress Redeem operation on CoGateway.
 *
 * @module lib/redeemAndUnstake/brandToken/ProgressRedeem
 */

const rootPrefix = '../../..',
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  ProgressRedeemBase = require(rootPrefix + '/lib/redeemAndUnstake/common/ProgressRedeem'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress');

/**
 * Class to perform Progress Redeem operation on CoGateway.
 *
 * @class ProgressRedeem
 */
class ProgressRedeem extends ProgressRedeemBase {
  /**
   * Constructor to perform Progress Redeem operation on CoGateway.
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
   * @param {string} params.secretString
   * @param {number} params.tokenId
   *
   * @augments ProgressRedeemBase
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
   * @returns {Promise<void>}
   * @private
   */
  async _fetchContractAddresses() {
    const oThis = this;

    await oThis._fetchCoGatewayContract();
  }

  /**
   * Fetch CoGateway contract address.
   *
   * @sets oThis.coGatewayContractAddress
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchCoGatewayContract() {
    const oThis = this;

    const tokenAddressesObj = new TokenAddressCache({ tokenId: oThis.tokenId }),
      addressesResp = await tokenAddressesObj.fetch();

    oThis.coGatewayContractAddress = addressesResp.data[tokenAddressConstants.tokenCoGatewayContract];
  }
}

module.exports = ProgressRedeem;
