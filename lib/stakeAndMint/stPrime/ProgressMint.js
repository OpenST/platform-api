'use strict';

const rootPrefix = '../../..',
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
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

    oThis.firstTimeMint = params.firstTimeMint;
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
      pendingTransactionKind: pendingTransactionConstants.progressMintKind
    };
  }
}

module.exports = ProgressMintForStPrime;
