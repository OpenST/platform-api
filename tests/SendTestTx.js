'use strict';
/**
 *
 * This module transfer stPrime for respective addresses passed in transferDetails(inputParam).
 *
 * @module lib/transfer/StPrime
 */
const rootPrefix = '..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain');

/**
 *
 * Class to transfer st prime.
 *
 * @class
 */
class TransferStPrime {
  constructor(params) {
    const oThis = this;
    oThis.auxChainId = 2000;

    oThis.auxGasPrice = contractConstants.auxChainGasPrice;
    oThis.gas = contractConstants.transferOstPrimeGas;
  }

  /**
   * Main Performer method.
   *
   * @returns {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis._setWeb3Instance();

    return oThis._executeTx();
  }

  /**
   * Set web3 instance.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.auxChainId]),
      auxChainConfig = response[oThis.auxChainId];

    oThis.auxWsProvider = auxChainConfig.auxGeth.readOnly.wsProviders[0];
  }

  /**
   * Fund address
   *
   * @returns {Promise<any[]>}
   * @private
   */
  async _executeTx() {
    const oThis = this;

    let txOptions = {
      from: '0x3ceefa4855a75dee019d480e840513c89a157af1',
      to: '0x094f7e57095b5df01113826340b6e21261240415',
      value: '1000000000',
      gas: oThis.gas,
      gasPrice: oThis.auxGasPrice,
      nonce: 1
    };

    let params = {
      chainId: oThis.auxChainId,
      provider: oThis.auxWsProvider,
      waitTillReceipt: 1,
      txOptions: txOptions
    };

    let txresp = await new SubmitTransaction(params).perform().catch(function(err) {
      logger.info('===Failed Transaction for ', txOptions, '\n------ response ---', err);
      return err;
    });

    console.log('txresp------------', txresp.internalErrorCode);

    return txresp;
  }
}

new TransferStPrime().perform().then(function(resp) {
  console.log('Lo bhai Jawab aa gaya...... Band karo ab..', resp);
  process.exit(0);
});
