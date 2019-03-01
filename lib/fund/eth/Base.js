'use strict';
/**
 *
 * Grant eth base class.
 *
 * @module lib/fund/eth/Base
 */
const rootPrefix = '../../..',
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  DynamicGasPriceCache = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice');

class Base {
  /**
   * @constructor
   *
   * @param params
   * @param params.originChainId   {Number}
   */
  constructor(params) {
    const oThis = this;

    oThis.originChainId = params.originChainId;

    oThis.txOptions = null;
    oThis.originWsProviders = null;
    oThis.originGasPrice = null;
  }

  /**
   * perform
   *
   * @return {Promise|*|Promise<T>}
   */
  async perform() {
    const oThis = this;

    await oThis._setWeb3Instance();

    await oThis._setOriginChainGasPrice();

    return oThis._performTransfers();
  }

  /**
   * set Web3 Instance
   *
   * @return {Promise<void>}
   */
  async _setWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.originChainId]),
      originChainConfig = response[oThis.originChainId];

    oThis.originWsProviders = originChainConfig.originGeth.readWrite.wsProviders;
  }

  /**
   * Fund ETH
   *
   * @param fromAddress {String}
   * @param toAddress {String}
   * @param amountInWei {String<Number>}
   * @param options {Object}
   *
   * @return {Promise<*>}
   *
   * @private
   */
  async _fundAddressWithEth(fromAddress, toAddress, amountInWei, options) {
    const oThis = this;

    let pendingTransactionExtraData = options.pendingTransactionExtraData,
      waitTillReceipt = options.waitTillReceipt || 0;

    oThis.txOptions = {
      from: fromAddress,
      to: toAddress,
      value: amountInWei,
      gas: contractConstants.transferEthGas,
      gasPrice: oThis.originGasPrice
    };

    let submitTxParams = {
      chainId: oThis.originChainId,
      txOptions: oThis.txOptions,
      waitTillReceipt: waitTillReceipt,
      providers: oThis.originWsProviders
    };

    if (pendingTransactionExtraData) {
      submitTxParams.options = pendingTransactionExtraData;
    }

    return new SubmitTransaction(submitTxParams).perform();
  }

  /**
   * Get origin chain gas price
   *
   * @return {Promise<*>}
   * @private
   */
  async _setOriginChainGasPrice() {
    const oThis = this;

    let dynamicGasPriceResponse = await new DynamicGasPriceCache().fetch();

    oThis.originGasPrice = dynamicGasPriceResponse.data;
  }

  /**
   * Perform transfer
   *
   * @return {Promise<*>}
   * @private
   */
  _performTransfers() {
    throw 'sub-class to implement';
  }
}

module.exports = Base;
