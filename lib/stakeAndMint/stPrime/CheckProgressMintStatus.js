'use strict';

const rootPrefix = '../../..',
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  CheckProgressMintStatusBase = require(rootPrefix + '/lib/stakeAndMint/common/CheckProgressMintStatusBase');

class CheckProgressMintStatusForStPrime extends CheckProgressMintStatusBase {
  /**
   * @constructor
   *
   * @param params
   */
  constructor(params) {
    super(params);
  }

  /**
   * Fetch gateway addresses
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchGatewayAddresses() {
    const oThis = this;

    // Fetch gateway
    let params = {
      chainId: oThis.originChainId,
      auxChainId: oThis.auxChainId,
      kinds: [chainAddressConstants.originGatewayContractKind]
    };

    let response = await new ChainAddressModel().fetchAddresses(params);

    let addresses = response.data.addresses;

    oThis.gatewayContract = addresses[chainAddressConstants.originGatewayContractKind];

    // Fetch co-gateway
    params = {
      chainId: oThis.auxChainId,
      auxChainId: oThis.auxChainId,
      kinds: [chainAddressConstants.auxCoGatewayContractKind]
    };

    response = await new ChainAddressModel().fetchAddresses(params);

    addresses = response.data.addresses;

    oThis.coGatewayContract = addresses[chainAddressConstants.auxCoGatewayContractKind];
  }
}

module.exports = CheckProgressMintStatusForStPrime;
