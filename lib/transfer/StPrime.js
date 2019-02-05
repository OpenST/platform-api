'use strict';
/**
 *
 * This module transfer stPrime for respective addresses passed in transferDetails(inputParam).
 *
 * @module lib/transfer/StPrime
 */
const rootPrefix = '../..',
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
  /**
   * @constructor
   *
   * @param {Object} params
   * @param {Integer} params.auxChainId
   * @param {Array} params.transferDetails - [{from:'', to: '', amountInWei:''},{from:'', to: '', amountInWei:''}]
   */
  constructor(params) {
    const oThis = this;
    oThis.auxChainId = params.auxChainId;
    oThis.transferDetails = params.transferDetails;

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

    await oThis._fundAddress();
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
  async _fundAddress() {
    const oThis = this,
      promiseArray = [];

    for (let i = 0; i < oThis.transferDetails.length; i++) {
      let transferData = oThis.transferDetails[i];
      let txOptions = {
        from: transferData.from,
        to: transferData.to,
        value: transferData.amountInWei,
        gas: oThis.gas,
        gasPrice: oThis.auxGasPrice
      };

      let params = {
        chainId: oThis.auxChainId,
        provider: oThis.auxWsProvider,
        waitTillReceipt: 1,
        txOptions: txOptions
      };

      promiseArray.push(
        new SubmitTransaction(params)
          .perform()
          .then(function(txResponse) {
            logger.info('===Success Transfer stPrime for ', txOptions, '\n------ response ---', txResponse);
          })
          .catch(function(err) {
            logger.info('===Failed Transfer stPrime for ', txOptions, '\n------ response ---', err);
          })
      );
    }

    return Promise.all(promiseArray);
  }
}

module.exports = TransferStPrime;
