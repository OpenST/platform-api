'use strict';

const rootPrefix = '../../..',
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  ProveGatewayBase = require(rootPrefix + '/lib/stakeAndMint/common/ProveGatewayBase');

class ProveGatewayForBt extends ProveGatewayBase {
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
      pendingTransactionKind: pendingTransactionConstants.proveGatewayOnCoGatewayKind
    };
  }
}

module.exports = ProveGatewayForBt;
