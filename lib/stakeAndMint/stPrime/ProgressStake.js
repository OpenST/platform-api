'use strict';

const rootPrefix = '../../..',
  ProgressStakeBase = require(rootPrefix + '/lib/stakeAndMint/common/ProgressStakeBase'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  DynamicGasPriceCache = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice');

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
   * Fetch Gateway address
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchGatewayContract() {
    const oThis = this;

    // Fetch gateway contract address
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    oThis.gatewayContract = chainAddressesRsp.data[chainAddressConstants.originGatewayContractKind].address;
  }

  /**
   * Get origin chain dynamic gas price
   *
   * @return {Promise<*>}
   * @private
   */
  async _fetchGasPrice() {
    const oThis = this;

    let dynamicGasPriceResponse = await new DynamicGasPriceCache().fetch();

    return dynamicGasPriceResponse.data;
  }
}

module.exports = ProgressStakeForStPrime;
