'use strict';

const rootPrefix = '../../..',
  ConfirmStakeIntentBase = require(rootPrefix + '/lib/stakeAndMint/common/ConfirmStakeIntentBase'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress');

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
   * Decide Staker in the transaction
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _getStakerAddress() {
    const oThis = this;

    return Promise.resolve(oThis.stakerAddress);
  }
}

module.exports = ConfirmStakeIntentForStPrime;
