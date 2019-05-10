/**
 * Module to perform Progress Unstake operation on Gateway.
 *
 * @module lib/redeemAndUnstake/common/ProgressUnstake
 */

const rootPrefix = '../../..',
  RedeemBase = require(rootPrefix + '/lib/redeemAndUnstake/Base'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  ContractInteractLayer = require(rootPrefix + '/lib/redeemAndUnstake/ContractInteractLayer'),
  util = require(rootPrefix + '/lib/util'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

/**
 * Class to perform Progress Unstake operation on Gateway.
 *
 * @class ProgressUnstake
 */
class ProgressUnstake extends RedeemBase {
  /**
   * Constructor to perform Progress Unstake operation on Gateway.
   *
   * @param {object} params
   * @param {object} params.payloadDetails
   * @param {number} params.originChainId
   * @param {number} params.auxChainId
   * @param {string} params.redeemerAddress
   * @param {number} params.amountToRedeem
   * @param {string} params.beneficiary
   * @param {string} params.facilitator
   * @param {string} params.messageHash
   * @param {string} params.secretString
   *
   * @augments RedeemBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.facilitator = params.facilitator;
    oThis.messageHash = params.messageHash;
    oThis.secretString = params.secretString;

    oThis.gatewayContractAddress = null;
  }

  /**
   * Set origin web3 instance.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    await oThis._setOriginWeb3Instance();
  }

  /**
   * Fetch contract addresses involved in transaction.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchContractAddresses() {
    const oThis = this;

    await oThis._fetchGatewayContract();
  }

  /**
   * Fetch Gateway contract address.
   *
   * @sets oThis.gatewayContractAddress
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchGatewayContract() {
    const oThis = this;

    // Fetch coGateway contract address
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    oThis.gatewayContractAddress = chainAddressesRsp.data[chainAddressConstants.originGatewayContractKind].address;
  }

  /**
   * Get Progress Unstake data to be submitted in transaction.
   *
   * @returns {Promise<any>}
   * @private
   */
  async _getProgressUnstakeData() {
    const oThis = this;

    const unlockSecretResp = util.getSecretHashLock(oThis.secretString);

    return ContractInteractLayer.getProgressUnstakeData(
      oThis.originWeb3,
      oThis.gatewayContractAddress,
      oThis.messageHash,
      unlockSecretResp.unlockSecret
    );
  }

  /**
   * Build transaction data to be submitted.
   *
   * @sets oThis.transactionData
   *
   * @returns {Promise<void>}
   * @private
   */
  async _buildTransactionData() {
    const oThis = this;

    const txData = await oThis._getProgressUnstakeData();

    const gasPrice = await oThis._fetchOriginGasPrice();

    oThis.transactionData = {
      gasPrice: gasPrice,
      gas: contractConstants.progressUnstakeGas,
      value: '0x0',
      from: oThis.facilitator,
      to: oThis.gatewayContractAddress,
      data: txData
    };
  }

  /**
   * Get chain id on which transaction would be submitted.
   *
   * @returns {*}
   * @private
   */
  _getChainId() {
    const oThis = this;

    return oThis.originChainId;
  }

  /**
   * Extra data to be merged in response.
   *
   * @returns {{}}
   * @private
   */
  _mergeExtraResponseData() {
    return {};
  }

  /**
   * Get pending transaction kind.
   *
   * @returns {string}
   * @private
   */
  _getPendingTransactionKind() {
    return pendingTransactionConstants.progressUnstakeKind;
  }
}

module.exports = ProgressUnstake;
