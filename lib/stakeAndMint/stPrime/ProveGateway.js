'use strict';

const rootPrefix = '../../..',
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  ProveGatewayBase = require(rootPrefix + '/lib/stakeAndMint/common/ProveGatewayBase');

class ProveGatewayForStPrime extends ProveGatewayBase {
  /**
   * @constructor
   *
   * @param params
   */
  constructor(params) {
    super(params);
  }

  /**
   * Fetch Gateway and CoGateway addresses
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchGatewayAddresses() {
    const oThis = this;

    // Fetch gateway contract address
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    oThis.gatewayContract = chainAddressesRsp.data[chainAddressConstants.originGatewayContractKind].address;
    oThis.coGatewayContract = chainAddressesRsp.data[chainAddressConstants.auxCoGatewayContractKind].address;
  }
}

module.exports = ProveGatewayForStPrime;
