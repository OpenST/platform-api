/**
 * Module to progress mint for StPrime.
 *
 * @module lib/stakeAndMint/stPrime/ProgressMint
 */

const rootPrefix = '../../..',
  ProgressMintBase = require(rootPrefix + '/lib/stakeAndMint/common/ProgressMintBase'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

/**
 * Class to progress mint for StPrime.
 *
 * @class ProgressMintForStPrime
 */
class ProgressMintForStPrime extends ProgressMintBase {
  /**
   * Constructor to progress mint for StPrime.
   *
   * @param {object} params
   * @param {number} params.auxChainId: Aux chain Id to prove gateway on.
   * @param {string} params.messageHash: messageHash.
   * @param {string} params.facilitator: Facilitator to help in proving.
   * @param {string} params.secretString: secretString
   * @param {boolean} [params.firstTimeMint]: First time mint or not (optional)
   *
   * @augments ProgressMintBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.firstTimeMint = params.firstTimeMint;
  }

  /**
   * Fetch co gateway contract address.
   *
   * @sets oThis.coGatewayContract
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchCoGatewayContractAddress() {
    const oThis = this;

    // Fetch gateway contract address
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    oThis.coGatewayContract = chainAddressesRsp.data[chainAddressConstants.auxCoGatewayContractKind].address;
  }

  /**
   * Fetch aux chain gas price.
   *
   * @return {string}
   * @private
   */
  _fetchGasPrice() {
    const oThis = this;

    // If firstTimeMint is true, gas price is set to '0x0', else default aux chain gas price is used.
    return oThis.firstTimeMint ? contractConstants.zeroGasPrice : contractConstants.auxChainGasPrice;
  }

  /**
   * Get submit transaction parameters.
   *
   * @return {object}
   */
  get _customSubmitTxParams() {
    return {
      pendingTransactionKind: pendingTransactionConstants.progressMintKind
    };
  }
}

module.exports = ProgressMintForStPrime;
