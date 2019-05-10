/**
 * Module to perform Progress Redeem operation on CoGateway.
 *
 * @module lib/redeemAndUnstake/brandToken/ProgressRedeem
 */

const rootPrefix = '../../..',
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  ProveCoGatewayBase = require(rootPrefix + '/lib/redeemAndUnstake/common/ProveCoGateway'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress');

/**
 * Class to perform Progress Redeem operation on CoGateway.
 *
 * @class ProveCoGateway
 */
class ProveCoGateway extends ProveCoGatewayBase {
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
   * @param {string} params.lastCommittedBlockNumber
   * @param {string} params.currentWorkflowId
   * @param {number} params.tokenId
   *
   * @augments ProveCoGatewayBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);
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

module.exports = ProveCoGateway;
