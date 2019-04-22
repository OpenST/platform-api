'use strict';
/*
 * This file performs redeem operation on CoGateway.
 *
 * @module lib/redeemAndUnstake/stPrime/Redeem
 */

const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  ContractInteractLayer = require(rootPrefix + '/lib/redeemAndUnstake/ContractInteractLayer'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  RedeemBase = require(rootPrefix + '/lib/redeemAndUnstake/Base');

class RedeemStPrime extends RedeemBase {
  /**
   * @constructor
   *
   * @param params
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.redeemerNonce = null;
    oThis.coGatewayContractAddress = null;
    oThis.hashLockResponse = {};
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

    await oThis._fetchCoGatewayContract();
  }

  /**
   * Fetch CoGateway contract address
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchCoGatewayContract() {
    const oThis = this;

    // Fetch coGateway contract address
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    oThis.coGatewayContractAddress = chainAddressesRsp.data[chainAddressConstants.auxCoGatewayContractKind].address;
  }

  /**
   * Get redeem data to be submitted in transaction.
   *
   * @returns {Promise<any>}
   * @private
   */
  async _getRedeemData() {
    const oThis = this;

    oThis.redeemerNonce = await ContractInteractLayer.getRedeemerNonce(
      oThis.auxWeb3,
      oThis.coGatewayContractAddress,
      oThis.redeemerAddress
    );

    oThis.hashLockResponse = util.getSecretHashLock();

    return ContractInteractLayer.getRedeemData(
      oThis.auxWeb3,
      oThis.coGatewayContractAddress,
      oThis.redeemerNonce,
      oThis.amountToRedeem,
      oThis.beneficiary,
      oThis.hashLockResponse.hashLock
    );
  }

  /**
   * Build transaction data to be submitted
   *
   * @returns {Promise<void>}
   * @private
   */
  async _buildTransactionData() {
    const oThis = this;

    let txData = await oThis._getRedeemData();

    oThis.transactionData = {
      gasPrice: contractConstants.auxChainGasPrice,
      gas: contractConstants.redeemStPrimeGas,
      value: '0x0',
      from: oThis.redeemerAddress,
      to: oThis.coGatewayContractAddress,
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
    const oThis = this;

    return {
      secretString: oThis.hashLockResponse.secret,
      redeemerNonce: oThis.redeemerNonce
    };
  }

  /**
   * Get Pending transaction kind
   *
   * @returns {string}
   * @private
   */
  _getPendingTransactionKind() {
    return pendingTransactionConstants.redeemStPrimeKind;
  }
}

module.exports = RedeemStPrime;
