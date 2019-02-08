'use strict';
/**
 *
 * Grant eth base class.
 *
 * @module lib/fund/eth/Base
 */
const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
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
    oThis.originWeb3 = null;
    oThis.originGasPrice = null;
  }

  /**
   * perform
   *
   * @return {Promise|*|Promise<T>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error(`${__filename}::perform::catch`);
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'l_f_e_b_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * Async perform
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _asyncPerform() {
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
    oThis.originWeb3 = web3Provider.getInstance(oThis.originWsProviders[0]).web3WsProvider;
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
      balances[address] = await oThis.originWeb3.eth.getBalance(address);
    }

    return balances;
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
      web3Instance: oThis.originWeb3
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
