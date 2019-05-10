/**
 * Module to help in Executing Token Holder Redemption transaction for company.
 *
 * @module lib/redeemAndUnstake/brandToken/ExecuteTokenHolderRedemption
 */

const rootPrefix = '../../..',
  RedeemBase = require(rootPrefix + '/lib/redeemAndUnstake/Base'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  ContractInteractLayer = require(rootPrefix + '/lib/redeemAndUnstake/ContractInteractLayer'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

/**
 * Class to help in Executing Token Holder Redemption transaction for company.
 *
 * @class ExecuteTokenHolderRedemption
 */
class ExecuteTokenHolderRedemption extends RedeemBase {
  /**
   * Constructor to help in Executing Token Holder Redemption transaction for company.
   *
   * @param {object} params
   * @param {object} params.payloadDetails
   * @param {number} params.originChainId
   * @param {number} params.auxChainId
   * @param {string} params.redeemerAddress
   * @param {number} params.amountToRedeem
   * @param {string} params.beneficiary
   * @param {number} params.tokenId
   * @param {string} params.facilitator
   * @param {string} params.signature
   * @param {string} params.multiSigNonce
   * @param {string} params.transactionExecutableData
   *
   * @augments RedeemBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.facilitator = params.facilitator;
    oThis.signatureData = params.signature;
    oThis.sessionKeyNonce = params.multiSigNonce;
    oThis.transactionExecutableData = params.transactionExecutableData;

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

    await oThis._fetchTokenContracts();
  }

  /**
   * Fetch token co gateway contract address.
   *
   * @sets oThis.coGatewayContractAddress
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchTokenContracts() {
    const oThis = this;

    const tokenAddressesObj = new TokenAddressCache({ tokenId: oThis.tokenId }),
      addressesResp = await tokenAddressesObj.fetch();

    oThis.coGatewayContractAddress = addressesResp.data[tokenAddressConstants.tokenCoGatewayContract];
  }

  /**
   * Get executable tx data.
   *
   * @return {Promise<any>}
   * @private
   */
  async _getExecutableTxData() {
    const oThis = this;

    return ContractInteractLayer.executeRedemptionRawTx(
      oThis.auxWeb3,
      oThis.redeemerAddress,
      oThis.coGatewayContractAddress,
      oThis.transactionExecutableData,
      oThis.sessionKeyNonce,
      oThis.signatureData.r,
      oThis.signatureData.s,
      oThis.signatureData.v
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

    const txData = await oThis._getExecutableTxData();

    oThis.transactionData = {
      gasPrice: contractConstants.auxChainGasPrice,
      gas: contractConstants.executeBTredemptionGas,
      value: '0x0',
      from: oThis.facilitator,
      to: oThis.redeemerAddress,
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
    return pendingTransactionConstants.tokenHolderRedemptionKind;
  }
}

module.exports = ExecuteTokenHolderRedemption;
