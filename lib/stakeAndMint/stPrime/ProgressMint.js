'use strict';

const rootPrefix = '../../..',
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ProgressMintBase = require(rootPrefix + '/lib/stakeAndMint/common/ProgressMintBase');

class ProgressMintForStPrime extends ProgressMintBase {
  /**
   * @constructor
   *
   * @param params
   */
  constructor(params) {
    super(params);

    const oThis = this;
  }

  /**
   * fetch co gateway contract address
   *
   * @private
   */
  async _fetchCoGatewayContractAddress() {
    const oThis = this;

    let params = {
      chainId: oThis.auxChainId,
      auxChainId: oThis.auxChainId,
      kind: chainAddressConstants.auxCoGatewayContractKind
    };

    let response = await new ChainAddressModel().fetchAddress(params);

    oThis.coGatewayContract = response.data.address;
  }
}

module.exports = ProgressMintForStPrime;
