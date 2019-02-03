'use strict';

const rootPrefix = '../../..',
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  ProgressMintBase = require(rootPrefix + '/lib/stakeAndMint/common/ProgressMintBase');

class ProgressMintForBt extends ProgressMintBase {
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenId = params.tokenId;
  }

  /**
   * fetch co gateway contract address
   *
   * @private
   */
  async _fetchCoGatewayContractAddress() {
    const oThis = this;

    let tokenAddressesObj = new TokenAddressCache({ tokenId: oThis.tokenId }),
      addressesResp = await tokenAddressesObj.fetch();

    oThis.coGatewayContract = addressesResp.data[tokenAddressConstants.tokenCoGatewayContract];
  }
}

module.exports = ProgressMintForBt;
