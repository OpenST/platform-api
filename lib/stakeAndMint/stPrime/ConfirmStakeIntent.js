'use strict';

const rootPrefix = '../../..',
  ConfirmStakeIntentBase = require(rootPrefix + '/lib/stakeAndMint/common/ConfirmStakeIntentBase'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress');

class ConfirmStakeIntentForStPrime extends ConfirmStakeIntentBase {
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

    let address = response.data.address;

    oThis.gatewayContract = address[chainAddressConstants.originGatewayContractKind];

    // Fetch co-gateway
    params = {
      chainId: oThis.auxChainId,
      auxChainId: oThis.auxChainId,
      kinds: [chainAddressConstants.auxCoGatewayContractKind]
    };

    response = await new ChainAddressModel().fetchAddresses(params);

    address = response.data.address;

    oThis.coGatewayContract = address[chainAddressConstants.auxCoGatewayContractKind];
  }
}

module.exports = ConfirmStakeIntentForStPrime;
