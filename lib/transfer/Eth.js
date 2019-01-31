'use strict';

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  gasPriceCacheKlass = require(rootPrefix + '/lib/sharedCacheManagement/EstimateOriginChainGasPrice'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain');

class TransferEth {
  /**
   *
   * @param params
   */
  constructor(params) {
    const oThis = this;
    oThis.originChainId = params.originChainId;
    oThis.transferDetails = params.transferDetails;

    oThis.originGasPrice = null;
    oThis.gas = contractConstants.transferEthGas;
  }

  async perform() {
    const oThis = this;

    await oThis._setWeb3Instance();

    await oThis._initializeVars();

    await oThis._fundAddress();
  }

  async _setWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.originChainId]),
      originChainConfig = response[oThis.originChainId];

    oThis.originWsProvider = originChainConfig.originGeth.readOnly.wsProviders[0];
  }

  async _initializeVars() {
    const oThis = this;

    let gasPriceCacheObj = new gasPriceCacheKlass(),
      gasPriceRsp = await gasPriceCacheObj.fetch();

    oThis.originGasPrice = gasPriceRsp.data;
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
    const oThis = this,
      promiseArray = [];

    for (let i = 0; i < oThis.transferDetails.length; i++) {
      let transferData = oThis.transferDetails[i];
      let txOptions = {
        from: transferData.from,
        to: transferData.to,
        value: transferData.amountInWei,
        gas: oThis.gas,
        gasPrice: oThis.originGasPrice
      };

      let params = {
        chainId: oThis.originChainId,
        provider: oThis.originWsProvider,
        waitTillReceipt: 1,
        txOptions: txOptions
      };
      let submitTx = new SubmitTransaction(params);

      promiseArray.push(
        submitTx
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

module.exports = TransferEth;
