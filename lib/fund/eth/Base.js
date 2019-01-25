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
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain');

class Base {
  /**
   * @constructor
   *
   * @param params
   * @param params.auxChainId      {Number}
   * @param params.originChainId   {Number}
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.originChainId = params.originChainId;

    oThis.fromAddress = null;
    oThis.gas = null;
    oThis.gasPrice = null;
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
   * Initialize variables
   *
   */
  _initializeVars() {
    const oThis = this;

    oThis.gasPrice = contractConstants.defaultOriginChainGasPrice;
    oThis.gas = coreConstants.OST_ORIGIN_GAS_LIMIT;
  }

  /**
   * set Web3 Instance
   *
   * @return {Promise<void>}
   */
  async _setWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.originChainId]);

    oThis.originChainConfig = response[oThis.originChainId];
    oThis.originWsProviders = oThis.originChainConfig.originGeth.readWrite.wsProviders;
    oThis.originWeb3 = web3Provider.getInstance(oThis.originWsProviders[0]).web3WsProvider;
  }

  /**
   * fetch Balances
   *
   * @return {Promise<void>}
   */
  async _fetchBalances() {
    const oThis = this;

    oThis.balances = {};

    for (let addressKind in oThis.addresses) {
      let address = oThis.addresses[addressKind];

      let balance = await oThis.originWeb3.eth.getBalance(address);

      oThis.balances[addressKind] = balance;
    }
  }

  /**
   * Fund address
   *
   * @param address
   * @param amount
   * @return {Promise<void>}
   * @private
   */
  async _fundAddress(address, amount) {
    const oThis = this;

    let txOptions = {
      from: oThis.fromAddress,
      to: address,
      value: amount,
      gas: oThis.gas,
      gasPrice: oThis.gasPrice
    };

    // Not sending options deliberately
    let submitTxRsp = await new SubmitTransaction({
      chainId: oThis.originChainId,
      provider: oThis.originWsProviders[0],
      txOptions: txOptions
    }).perform();

    logger.info('===Submitted transaction', submitTxRsp.data['transactionHash'], 'for address', txOptions.to);
  }

  /**
   * Fetch recipient address
   *
   * @private
   */
  _fetchRecipientAddresses() {
    throw 'sub-class to implement';
  }
}

module.exports = Base;
