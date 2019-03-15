'use strict';
/**
 *
 * Grant STPrime base class.
 *
 * @module lib/fund/stPrime/Base
 */
const rootPrefix = '../../..',
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain');

class Base {
  /**
   * @constructor
   *
   * @param params
   * @param params.auxChainId      {Number}
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params.auxChainId;

    oThis.txOptions = null;
    oThis.auxWsProviders = null;
    oThis.auxWeb3 = null;
  }

  /**
   * perform
   *
   * @return {Promise|*|Promise<T>}
   */
  async perform() {
    const oThis = this;

    await oThis._setWeb3Instance();

    return oThis._performTransfers();
  }

  /**
   * set Web3 Instance
   *
   * @return {Promise<void>}
   */
  async _setWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.auxChainId]),
      auxChainConfig = response[oThis.auxChainId];

    let providers = auxChainConfig.auxGeth.readWrite.wsProviders;

    let shuffledProviders = basicHelper.shuffleArray(providers);

    oThis.auxWeb3 = web3Provider.getInstance(shuffledProviders[0]).web3WsProvider;
  }

  /**
   * fetch balances of given addresses
   *
   * @param addresses {Array}
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchBalances(addresses) {
    const oThis = this,
      balances = {};

    for (let i = 0; i < addresses.length; i++) {
      let address = addresses[i];
      balances[address] = await oThis.auxWeb3.eth.getBalance(address);
    }

    return balances;
  }

  /**
   * Fund ST Prime
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
  async _fundAddressWithSTPrime(fromAddress, toAddress, amountInWei, options) {
    const oThis = this;

    let pendingTransactionExtraData = options.pendingTransactionExtraData,
      waitTillReceipt = options.waitTillReceipt || 0;

    oThis.txOptions = {
      from: fromAddress,
      to: toAddress,
      value: amountInWei,
      gas: contractConstants.transferOstPrimeGas,
      gasPrice: contractConstants.auxChainGasPrice
    };

    let submitTxParams = {
      chainId: oThis.auxChainId,
      txOptions: oThis.txOptions,
      waitTillReceipt: waitTillReceipt,
      web3Instance: oThis.auxWeb3
    };

    if (options.pendingTransactionKind) {
      submitTxParams.pendingTransactionKind = options.pendingTransactionKind;
    }

    if (options.tokenId) {
      submitTxParams.tokenId = options.tokenId;
    }

    if (pendingTransactionExtraData) {
      submitTxParams.options = pendingTransactionExtraData;
    }

    return new SubmitTransaction(submitTxParams).perform();
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
