/**
 * Module to check mint status for Branded Token.
 *
 * @module lib/stakeAndMint/brandedToken/CheckMintStatus
 */

const rootPrefix = '../../..',
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  CheckMintStatusBase = require(rootPrefix + '/lib/stakeAndMint/common/CheckMintStatusBase'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress');

/**
 * Class to check mint status for Branded Token.
 *
 * @class CheckMintStatusForBt
 */
class CheckMintStatusForBt extends CheckMintStatusBase {
  /**
   * Constructor to check mint status for Branded Token.
   *
   * @param {object} params
   * @param {string/number} params.chainId
   * @param {string/number} params.tokenId
   * @param {string} params.transactionHash
   * @param {string} params.messageHash
   * @param {string} params.currentStep
   * @param {string/number} params.auxChainId
   * @param {string/number} params.originChainId
   *
   * @augments CheckMintStatusBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenId = params.tokenId;
  }

  /**
   * Fetch gateway addresses.
   *
   * @sets oThis.gatewayContract, oThis.coGatewayContract
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchGatewayAddresses() {
    const oThis = this;

    const tokenAddressesObj = new TokenAddressCache({ tokenId: oThis.tokenId }),
      addressesResp = await tokenAddressesObj.fetch();

    oThis.gatewayContract = addressesResp.data[tokenAddressConstants.tokenGatewayContract];
    oThis.coGatewayContract = addressesResp.data[tokenAddressConstants.tokenCoGatewayContract];
  }
}

module.exports = CheckMintStatusForBt;
