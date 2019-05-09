/**
 * Module to perform Progress Redeem operation on CoGateway.
 *
 * @module lib/redeemAndUnstake/common/ProgressRedeem
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
 * Class to perform Progress Redeem operation on CoGateway.
 *
 * @class ProgressRedeem
 */
class ProgressRedeem extends RedeemBase {
  /**
   * Constructor to perform Progress Redeem operation on CoGateway.
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

    oThis.coGatewayContractAddress = null;
  }

  /**
   * Set aux web3 instance.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    await oThis._setAuxWeb3Instance();
  }

  /**
   * Fetch contract addresses involved in transaction.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchContractAddresses() {
    const oThis = this;

    await oThis._fetchCoGatewayContract();
  }

  /**
   * Fetch CoGateway contract address.
   *
   * @sets oThis.coGatewayContractAddress
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchCoGatewayContract() {
    const oThis = this;

    // Fetch coGateway contract address.
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    oThis.coGatewayContractAddress = chainAddressesRsp.data[chainAddressConstants.auxCoGatewayContractKind].address;
  }

  /**
   * Get Progress Redeem data to be submitted in transaction.
   *
   * @returns {Promise<any>}
   * @private
   */
  async _getProgressRedeemData() {
    const oThis = this;

    const unlockSecretResp = util.getSecretHashLock(oThis.secretString);

    return ContractInteractLayer.getProgressRedeemData(
      oThis.auxWeb3,
      oThis.coGatewayContractAddress,
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

    const txData = await oThis._getProgressRedeemData();

    oThis.transactionData = {
      gasPrice: contractConstants.auxChainGasPrice,
      gas: contractConstants.progressRedeemGas,
      value: '0x0',
      from: oThis.facilitator,
      to: oThis.coGatewayContractAddress,
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

    return oThis.auxChainId;
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
    return pendingTransactionConstants.progressRedeemKind;
  }
}

module.exports = ProgressRedeem;
