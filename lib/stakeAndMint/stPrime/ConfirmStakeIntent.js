'use strict';

const rootPrefix = '../../..',
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  ConfirmStakeIntentBase = require(rootPrefix + '/lib/stakeAndMint/common/ConfirmStakeIntentBase'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress');

class ConfirmStakeIntentForStPrime extends ConfirmStakeIntentBase {
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

  /**
   *
   * @return {Object}
   *
   */
  get _customSubmitTxParams() {
    const oThis = this;
    return {
      pendingTransactionKind: pendingTransactionConstants.confirmStakeIntentKind
    };
  }
}

module.exports = ConfirmStakeIntentForStPrime;
