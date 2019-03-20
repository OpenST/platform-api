'use strict';

const rootPrefix = '../../..',
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  ConfirmStakeIntentBase = require(rootPrefix + '/lib/stakeAndMint/common/ConfirmStakeIntentBase'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress');

class ConfirmStakeIntentForBt extends ConfirmStakeIntentBase {
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
   * Fetch gateway addresses
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchGatewayAddresses() {
    const oThis = this;

    let tokenAddressesObj = new TokenAddressCache({ tokenId: oThis.tokenId }),
      addressesResp = await tokenAddressesObj.fetch();

    oThis.gatewayContract = addressesResp.data[tokenAddressConstants.tokenGatewayContract];

    oThis.coGatewayContract = addressesResp.data[tokenAddressConstants.tokenCoGatewayContract];
  }

  /**
   * Decide Staker in the transaction
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _getStakerAddress() {
    const oThis = this;

    // In case of BT Gateway Composer would be staker.
    await oThis._fetchStakerGatewayComposer();
    return Promise.resolve(oThis.gatewayComposer);
  }

  /**
   * Aux chain gas price for BT stake and mint
   *
   * @return {*}
   * @private
   */
  _fetchGasPrice() {
    const oThis = this;

    return contractConstants.auxChainGasPrice;
  }

  /**
   *
   * @return {Object}
   *
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
