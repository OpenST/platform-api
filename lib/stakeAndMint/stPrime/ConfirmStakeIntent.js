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

    let params = {
      chainId: oThis.auxChainId,
      auxChainId: oThis.auxChainId,
      kinds: [chainAddressConstants.originGatewayContractKind, chainAddressConstants.auxCoGatewayContractKind]
    };

    let response = await new ChainAddressModel().fetchAddresses(params);

    let addresses = response.data.addresses;

    oThis.originGatewayContractKind = addresses[chainAddressConstants.originGatewayContractKind];
    oThis.auxCoGatewayContractKind = addresses[chainAddressConstants.auxCoGatewayContractKind];
  }
}

module.exports = ConfirmStakeIntentForStPrime;
