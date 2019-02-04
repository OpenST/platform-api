'use strict';

const rootPrefix = '../../..',
  ProgressStakeBase = require(rootPrefix + '/lib/stakeAndMint/common/ProgressStakeBase'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress');

class ProgressStakeForStPrime extends ProgressStakeBase {
  /**
   * @constructor
   *
   * @param params
   */
  constructor(params) {
    super(params);
    const oThis = this;

    oThis.auxChainId = params.auxChainId;
  }

  /**
   * Fetch gateway contract
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchGatewayContract() {
    const oThis = this;

    let params = {
      chainId: oThis.originChainId,
      auxChainId: oThis.auxChainId,
      kinds: [chainAddressConstants.originGatewayContractKind]
    };

    let response = await new ChainAddressModel().fetchAddresses(params);

    let address = response.data.address;

    oThis.gatewayContract = address[chainAddressConstants.originGatewayContractKind];
  }
}

module.exports = ProgressStakeForStPrime;
