/**
 * Module to confirm stake intent for StPrime.
 *
 * @module lib/stakeAndMint/stPrime/ConfirmStakeIntent
 */

const rootPrefix = '../../..',
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  ConfirmStakeIntentBase = require(rootPrefix + '/lib/stakeAndMint/common/ConfirmStakeIntentBase'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

/**
 * Class to confirm stake intent for StPrime.
 *
 * @class ConfirmStakeIntentForStPrime
 */
class ConfirmStakeIntentForStPrime extends ConfirmStakeIntentBase {
  /**
   * Constructor to confirm stake intent for StPrime.
   *
   * @param {object} params
   * @param {number} params.auxChainId: Aux chain Id to prove gateway on.
   * @param {number} params.originChainId: Origin chain Id to prove gateway of.
   * @param {string/number} params.amountMinted: amountMinted.
   * @param {string} params.messageHash: messageHash.
   * @param {string} params.stakerAddress: stakerAddress.
   * @param {string} params.facilitator: Facilitator to help in proving.
   * @param {string} params.secretString: secretString
   * @param {string} params.stakerNonce: stakerNonce
   * @param {string} params.beneficiary: beneficiary.
   * @param {string} params.gasPrice: gasPrice
   * @param {string} params.gasLimit: gasLimit
   * @param {string} params.proveGatewayBlockNumber: proveGatewayBlockNumber
   * @param {boolean} [params.firstTimeMint]: First time mint or not (optional)
   *
   * @augments ConfirmStakeIntentBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.firstTimeMint = params.firstTimeMint;
  }

  /**
   * Fetch Gateway and CoGateway addresses.
   *
   * @sets oThis.gatewayContract, oThis.coGatewayContract
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchGatewayAddresses() {
    const oThis = this;

    // Fetch gateway contract address
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    oThis.gatewayContract = chainAddressesRsp.data[chainAddressConstants.originGatewayContractKind].address;
    oThis.coGatewayContract = chainAddressesRsp.data[chainAddressConstants.auxCoGatewayContractKind].address;
  }

  /**
   * Decide staker in the transaction.
   *
   * @return {Promise<void>}
   * @private
   */
  async _getStakerAddress() {
    const oThis = this;

    return oThis.stakerAddress;
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
      pendingTransactionKind: pendingTransactionConstants.confirmStakeIntentKind
    };
  }
}

module.exports = ConfirmStakeIntentForStPrime;
