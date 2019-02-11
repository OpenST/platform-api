'use strict';

const rootPrefix = '../../..',
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  CheckMintStatusBase = require(rootPrefix + '/lib/stakeAndMint/common/CheckMintStatusBase');

class CheckMintStatusForStPrime extends CheckMintStatusBase {
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

module.exports = CheckMintStatusForStPrime;