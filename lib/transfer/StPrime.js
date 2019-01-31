'use strict';

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain');

class TransferStPrime {
  /**
   *
   * @param params
   */
  constructor(params) {
    const oThis = this;
    oThis.auxChainId = params.auxChainId;
    oThis.transferDetails = params.transferDetails;

    oThis.auxGasPrice = contractConstants.auxChainGasPrice;
    oThis.gas = contractConstants.transferOstPrimeGas;
  }

  async perform() {
    const oThis = this;

    await oThis._setWeb3Instance();

    await oThis._fundAddress();
  }

  async _setWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.auxChainId]),
      auxChainConfig = response[oThis.auxChainId];

    oThis.auxWsProvider = auxChainConfig.auxGeth.readOnly.wsProviders[0];
  }

  /**
   * Fund address
   *
   * @param address
   * @param amount
   * @return {Promise<void>}
   * @private
   */
  async _fundAddress(address, amount, options) {
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

      if (options) params['options'] = options;

      promiseArray.push(
        new SubmitTransaction(params)
          .perform()
          .then(function(txResponse) {
            logger.info('===Success Transfer eth --- for ', txOptions, '\n------ response ---', txResponse);
          })
          .catch(function(err) {
            logger.info('===Failed Transfer eth --- for ', txOptions, '\n------ response ---', err);
          })
      );
    }

    return Promise.all(promiseArray);
  }
}

module.exports = TransferStPrime;
