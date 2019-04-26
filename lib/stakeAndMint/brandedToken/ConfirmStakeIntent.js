/**
 * Module to confirm stake intent for branded token.
 *
 * @module lib/stakeAndMint/brandedToken/ConfirmStakeIntent
 */

const rootPrefix = '../../..',
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  ConfirmStakeIntentBase = require(rootPrefix + '/lib/stakeAndMint/common/ConfirmStakeIntentBase'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

/**
 * Class to confirm stake intent for branded token.
 *
 * @class ConfirmStakeIntentForBt
 */
class ConfirmStakeIntentForBt extends ConfirmStakeIntentBase {
  /**
   * Constructor to confirm stake intent for branded token.
   *
   * @param {object} params
   * @param {number} params.auxChainId: Aux chain Id to prove gateway on.
   * @param {number} params.tokenId: Token id.
   * @param {number} params.originChainId: Origin chain Id to prove gateway of.
   * @param {string/number} params.amountMinted: amountMinted.
   * @param {string} params.messageHash: messageHash.
   * @param {string} params.stakerAddress: stakerAddress.
   * @param {string} params.facilitator: Facilitator to help in proving.
   * @param {string} params.secretString: secretString
   * @param {string} params.stakerNonce: stakerNonce
   * @param {string} params.beneficiary: beneficiary.
   * @param {string} params.gasPrice: gasPrice
   * @param {string} params.gasLimit: gasLimit
   * @param {string} params.proveGatewayBlockNumber: proveGatewayBlockNumber
   * @param {boolean} [params.firstTimeMint]: First time mint or not (optional)
   *
   * @augments ConfirmStakeIntentBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenId = params.tokenId;
  }

  /**
   * Fetch Gateway and CoGateway addresses.
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

  /**
   * Decide staker in the transaction.
   *
   * @return {Promise<void>}
   * @private
   */
  async _getStakerAddress() {
    const oThis = this;

    // In case of BT, Gateway Composer would be staker.
    await oThis._fetchStakerGatewayComposer();

    return oThis.gatewayComposer;
  }

  /**
   * Aux chain gas price for BT stake and mint.
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
      pendingTransactionKind: pendingTransactionConstants.confirmStakeIntentKind
    };
  }
}

module.exports = ConfirmStakeIntentForBt;
