/**
 * Module to perform Progress Redeem operation on CoGateway.
 *
 * @module lib/redeemAndUnstake/brandToken/ProgressRedeem
 */

const rootPrefix = '../../..',
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  ProgressUnstakeBase = require(rootPrefix + '/lib/redeemAndUnstake/common/ProgressUnstake'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress');

/**
 * Class to perform Progress Redeem operation on CoGateway.
 *
 * @class ProgressUnstake
 */
class ProgressUnstake extends ProgressUnstakeBase {
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
   * @augments ProgressUnstakeBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);
  }

  /**
   * Fetch contract addresses involved in transaction.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchContractAddresses() {
    const oThis = this;

    await oThis._fetchGatewayContract();
  }

  /**
   * Fetch Gateway contract address.
   *
   * @sets oThis.gatewayContractAddress
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchGatewayContract() {
    const oThis = this;

    const tokenAddressesObj = new TokenAddressCache({ tokenId: oThis.tokenId }),
      addressesResp = await tokenAddressesObj.fetch();

    oThis.gatewayContractAddress = addressesResp.data[tokenAddressConstants.tokenGatewayContract];
  }
}

module.exports = ProgressUnstake;
