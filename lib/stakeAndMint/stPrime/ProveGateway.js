'use strict';

const rootPrefix = '../../..',
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
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

    const oThis = this;
    oThis.firstTimeMint = params.firstTimeMint;
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

  /**
   * fetch aux chain gas price
   *
   * @return {string}
   * @private
   */
  _fetchGasPrice() {
    const oThis = this;

    // if firstTimeMint is true, gas price is set to '0x0', else default aux chain gas price is used.
    return oThis.firstTimeMint ? contractConstants.zeroGasPrice : contractConstants.auxChainGasPrice;
  }
}

module.exports = ProveGatewayForStPrime;
