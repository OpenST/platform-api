'use strict';
/*
 * This file Wraps ST Prime as BT to perform operations of Redeem.
 *
 * @module lib/redeemAndUnstake/stPrime/WrapSTPrimeAsBt
 */

const rootPrefix = '../../..',
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  ContractInteractLayer = require(rootPrefix + '/lib/redeemAndUnstake/ContractInteractLayer'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  RedeemBase = require(rootPrefix + '/lib/redeemAndUnstake/Base');

class WrapSTPrimeAsBt extends RedeemBase {
  /**
   * @constructor
   *
   * @param params
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.stPrimeContractAddress = null;
  }

  /**
   * Set Aux web3 instance
   *
   * @returns {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    await oThis._setAuxWeb3Instance();
  }

  /**
   * Fetch contract addresses involved in transaction
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchContractAddresses() {
    const oThis = this;

    await oThis._fetchStPrimeContract();
  }

  /**
   * Fetch ST Prime contract address
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchStPrimeContract() {
    const oThis = this;

    // Fetch StPrime contract address
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    oThis.stPrimeContractAddress = chainAddressesRsp.data[chainAddressConstants.stPrimeContractKind].address;
  }

  /**
   * Get wrap data to be submitted in transaction.
   *
   * @returns {Promise<any>}
   * @private
   */
  async _getWrapData() {
    const oThis = this;

    return ContractInteractLayer.getWrapData(oThis.auxWeb3, oThis.stPrimeContractAddress);
  }

  /**
   * Build transaction data to be submitted
   *
   * @returns {Promise<void>}
   * @private
   */
  async _buildTransactionData() {
    const oThis = this;

    let txData = await oThis._getWrapData();

    oThis.transactionData = {
      gasPrice: contractConstants.auxChainGasPrice,
      gas: contractConstants.wrapStPrimeGas,
      value: oThis.amountToRedeem,
      from: oThis.redeemerAddress,
      to: oThis.stPrimeContractAddress,
      data: txData
    };
  }

  /**
   * Get chain id on which transaction would be submitted
   *
   * @returns {*}
   * @private
   */
  _getChainId() {
    const oThis = this;

    return oThis.auxChainId;
  }

  /**
   * Extra data to be merged in response
   *
   * @returns {{}}
   * @private
   */
  _mergeExtraResponseData() {
    return {};
  }

  /**
   * Get Pending transaction kind
   *
   * @returns {string}
   * @private
   */
  _getPendingTransactionKind() {
    return pendingTransactionConstants.wrapStPrimeAsBTKind;
  }
}

module.exports = WrapSTPrimeAsBt;
