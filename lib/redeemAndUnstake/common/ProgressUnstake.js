'use strict';
/*
 * This file performs Progress Unstake operation on Gateway.
 *
 * @module lib/redeemAndUnstake/common/ProgressUnstake
 */

const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  ContractInteractLayer = require(rootPrefix + '/lib/redeemAndUnstake/ContractInteractLayer'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  RedeemBase = require(rootPrefix + '/lib/redeemAndUnstake/Base');

class ProgressUnstake extends RedeemBase {
  /**
   * @constructor
   *
   * @param params
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
   * Set Origin web3 instance
   *
   * @returns {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    await oThis._setOriginWeb3Instance();
  }

  /**
   * Fetch contract addresses involved in transaction
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchContractAddresses() {
    const oThis = this;

    await oThis._fetchGatewayContract();
  }

  /**
   * Fetch Gateway contract address
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchGatewayContract() {
    const oThis = this;

    // Fetch coGateway contract address
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
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

    let unlockSecretResp = util.getSecretHashLock(oThis.secretString);

    return ContractInteractLayer.getProgressUnstakeData(
      oThis.originWeb3,
      oThis.gatewayContractAddress,
      oThis.messageHash,
      unlockSecretResp.unlockSecret
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

    let txData = await oThis._getProgressUnstakeData();

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
   * Get chain id on which transaction would be submitted
   *
   * @returns {*}
   * @private
   */
  _getChainId() {
    const oThis = this;

    return oThis.originChainId;
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
    return pendingTransactionConstants.progressUnstakeKind;
  }
}

module.exports = ProgressUnstake;
