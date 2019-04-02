'use strict';
/*
 * This module helps in Executing Token Holder Redemption transaction for company.
 *
 * @module lib/redeemAndUnstake/brandToken/ExecuteTokenHolderRedemption
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer,
  BigNumber = require('bignumber.js');

const rootPrefix = '../../..',
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  ContractInteractLayer = require(rootPrefix + '/lib/redeemAndUnstake/ContractInteractLayer'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  RedeemBase = require(rootPrefix + '/lib/redeemAndUnstake/Base');

class ExecuteTokenHolderRedemption extends RedeemBase {
  /**
   * @constructor
   *
   * @param params
   */
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.tokenId = params.tokenId;
    oThis.facilitator = params.facilitator;
    oThis.signatureData = params.signature;
    oThis.sessionKeyNonce = params.multiSigNonce;
    oThis.transactionExecutableData = params.transactionExecutableData;

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

    await oThis._fetchTokenContracts();
  }

  /**
   * Fetch token co gateway contract address.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchTokenContracts() {
    const oThis = this;

    let tokenAddressesObj = new TokenAddressCache({ tokenId: oThis.tokenId }),
      addressesResp = await tokenAddressesObj.fetch();

    oThis.coGatewayContractAddress = addressesResp.data[tokenAddressConstants.tokenCoGatewayContract];
  }

  /**
   * Get executable tx data
   * @private
   */
  async _getExecutableTxData() {
    const oThis = this;

    console.log('sessionNonce', oThis.sessionKeyNonce);

    console.log('executeRedemptionRawTxInput', [
      oThis.redeemerAddress,
      oThis.coGatewayContractAddress,
      oThis.transactionExecutableData,
      oThis.sessionKeyNonce,
      oThis.signatureData.r,
      oThis.signatureData.s,
      oThis.signatureData.v
    ]);

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
   * Build transaction data to be submitted
   *
   * @returns {Promise<void>}
   * @private
   */
  async _buildTransactionData() {
    const oThis = this;

    let txData = await oThis._getExecutableTxData();

    console.log('txData', txData);

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
}

module.exports = ExecuteTokenHolderRedemption;
