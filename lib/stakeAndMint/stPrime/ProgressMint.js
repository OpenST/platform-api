'use strict';

const rootPrefix = '../../..',
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
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
   * Fetch CoGateway address
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchCoGatewayContractAddress() {
    const oThis = this;

    // Fetch gateway contract address
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    oThis.coGatewayContract = chainAddressesRsp.data[chainAddressConstants.auxCoGatewayContractKind].address;
  }
}

module.exports = ProgressMintForStPrime;
