'use strict';
/*
 * This file performs Progress Redeem operation on CoGateway.
 *
 * @module lib/redeemAndUnstake/common/ProgressRedeem
 */

const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  ContractInteractLayer = require(rootPrefix + '/lib/redeemAndUnstake/ContractInteractLayer'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  RedeemBase = require(rootPrefix + '/lib/redeemAndUnstake/Base');

class ProgressRedeem extends RedeemBase {
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

    oThis.coGatewayContractAddress = null;
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
   * Get Progress Redeem data to be submitted in transaction.
   *
   * @returns {Promise<any>}
   * @private
   */
  async _getProgressRedeemData() {
    const oThis = this;

    let unlockSecretResp = util.getSecretHashLock(oThis.secretString);

    return ContractInteractLayer.getProgressRedeemData(
      oThis.auxWeb3,
      oThis.coGatewayContractAddress,
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

    let txData = await oThis._getProgressRedeemData();

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
    return pendingTransactionConstants.progressRedeemKind;
  }
}

module.exports = ProgressRedeem;
