/**
 * Module to progress mint for branded token.
 *
 * @module lib/stakeAndMint/brandedToken/ProgressMint
 */

const rootPrefix = '../../..',
  ProgressMintBase = require(rootPrefix + '/lib/stakeAndMint/common/ProgressMintBase'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

/**
 * Class to progress mint for branded token.
 *
 * @class ProgressMintForBt
 */
class ProgressMintForBt extends ProgressMintBase {
  /**
   * Constructor to progress mint for branded token.
   *
   * @param {object} params
   * @param {number} params.auxChainId: Aux chain Id to prove gateway on.
   * @param {number} params.tokenId: token Id.
   * @param {string} params.messageHash: messageHash.
   * @param {string} params.facilitator: Facilitator to help in proving.
   * @param {string} params.secretString: secretString
   * @param {boolean} [params.firstTimeMint]: First time mint or not (optional)
   *
   * @augments ProgressMintBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenId = params.tokenId;
  }

  /**
   * Fetch co gateway contract address.
   *
   * @sets oThis.coGatewayContract
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchCoGatewayContractAddress() {
    const oThis = this;

    const tokenAddressesObj = new TokenAddressCache({ tokenId: oThis.tokenId }),
      addressesResp = await tokenAddressesObj.fetch();

    oThis.coGatewayContract = addressesResp.data[tokenAddressConstants.tokenCoGatewayContract];
  }

  /**
   * Fetch aux chain gas price.
   *
   * @return {string}
   * @private
   */
  _fetchGasPrice() {
    return contractConstants.auxChainGasPrice;
  }

  /**
   * Get submit transaction parameters.
   *
   * @return {object}
   */
  get _customSubmitTxParams() {
    const oThis = this;

    return {
      tokenId: oThis.tokenId,
      pendingTransactionKind: pendingTransactionConstants.progressMintKind
    };
  }
}

module.exports = ProgressMintForBt;
