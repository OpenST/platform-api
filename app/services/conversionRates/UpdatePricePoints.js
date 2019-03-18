/**
 * Fetch OST Current price in given currency from coin market cap and set in price oracle.
 *
 * @module app/services/conversionRates/UpdatePricePoints
 */

const requestPromise = require('request-promise'),
  OpenSTOracle = require('@ostdotcom/ost-price-oracle'),
  PriceOracleHelper = OpenSTOracle.PriceOracleHelper,
  exchangeUrl = 'https://api.coinmarketcap.com/v1/ticker/simple-token';

const rootPrefix = '../../..',
  ErrorLogsConstants = require(rootPrefix + '/lib/errorLogs/ErrorLogsConstants'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  OstPricePointsCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/OstPricePoint'),
  CurrencyConversionRateModel = require(rootPrefix + '/app/models/mysql/CurrencyConversionRate'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  conversionRateConstants = require(rootPrefix + '/lib/globalConstant/conversionRates');

/**
 * Class to update price points in currency conversion table.
 *
 * @class
 */
class UpdatePricePoints {
  /**
   * Fetch OST Current price
   *
   * @param {Object} params
   * @param {String/Number} params.auxChainId
   * @param {String} params.quoteCurrency: Currency to fetch price in. eg: (USD or EUR)
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.quoteCurrency = params.quoteCurrency || conversionRateConstants.USD;

    oThis.currentTime = Math.floor(new Date().getTime() / 1000);
    oThis.currentOstValue = null;
    oThis.maxRetryCountForVerifyPriceInContract = 100;
    oThis.setPricePointTxHash = null;
  }

  /**
   * Main performer.
   *
   * @return {Promise<>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      }
      logger.error('app/services/conversionRates/UpdatePricePoints.js::perform::catch');
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 'a_s_cr_upp_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    });
  }

  /**
   * Async perform.
   *
   * @return {Promise<>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis._fetchPricePointFromCoinMarketCapApi();

    await oThis._insertPricePointInTable();

    await oThis._fetchAddress();

    await oThis._setPriceInContract();

    await oThis._updateTxHashInTable();

    await oThis._compareContractPrice();
  }

  /**
   * Parse Response from CoinMarketCap
   *
   * Sets oThis.currentOstValue
   */
  async _fetchPricePointFromCoinMarketCapApi() {
    const oThis = this;
    const url = exchangeUrl + '?convert=' + oThis.quoteCurrency;

    // Make CoinMarketCap API call.
    const response = await requestPromise(url);

    try {
      const ostValue = JSON.parse(response)[0];
      logger.debug('OST Value From CoinMarketCap:', ostValue);
      if (!ostValue || ostValue.symbol !== conversionRateConstants.OST) {
        const errorObject = responseHelper.error({
          internal_error_identifier: 'invalid_ost_value:a_s_cr_upp_3',
          api_error_identifier: 'invalid_ost_value',
          debug_options: { ostValue: ostValue }
        });

        await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);

        return;
      }
      const pricePoint = ostValue['price_' + oThis.quoteCurrency.toLowerCase()];
      if (!pricePoint || pricePoint < 0) {
        const errorObject = responseHelper.error({
          internal_error_identifier: 'invalid_ost_price:a_s_cr_upp_4',
          api_error_identifier: 'invalid_ost_price',
          debug_options: { pricePoint: pricePoint }
        });

        await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);

        return;
      }

      oThis.currentOstValue = {
        baseCurrency: conversionRateConstants.OST,
        quoteCurrency: oThis.quoteCurrency,
        conversionRate: pricePoint,
        timestamp: oThis.currentTime,
        status: conversionRateConstants.inProcess
      };
    } catch (err) {
      const errorObject = responseHelper.error({
        internal_error_identifier: 'invalid_cmc_response:a_s_cr_upp_5',
        api_error_identifier: 'invalid_cmc_response',
        debug_options: { cmcResponse: response }
      });

      await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);
    }
  }

  /**
   * Insert price points
   *
   * @return {Promise<Promise<never> | Promise<any>>}
   *
   * @private
   */
  async _insertPricePointInTable() {
    const oThis = this;

    // Insert current ost value in database
    const insertResponse = await new CurrencyConversionRateModel()
      .insert({
        chain_id: oThis.auxChainId,
        base_currency: conversionRateConstants.invertedBaseCurrencies[oThis.currentOstValue.baseCurrency],
        quote_currency: conversionRateConstants.invertedQuoteCurrencies[oThis.currentOstValue.quoteCurrency],
        conversion_rate: oThis.currentOstValue.conversionRate,
        timestamp: oThis.currentOstValue.timestamp,
        status: conversionRateConstants.invertedStatuses[oThis.currentOstValue.status]
      })
      .fire();

    if (!insertResponse) {
      logger.error('Error while inserting data in table');

      return Promise.reject();
    }

    oThis.dbRowId = insertResponse.insertId;
  }

  /**
   * Fetch admin/ops address.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchAddress() {
    const oThis = this;

    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_cr_upp_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.auxPriceOracleContractWorkerAddress =
      chainAddressesRsp.data[chainAddressConstants.auxPriceOracleContractWorkerKind][0].address;
    oThis.auxPriceOracleContractAddress =
      chainAddressesRsp.data[chainAddressConstants.auxPriceOracleContractKind].address;
  }

  /**
   * Set web3 instance.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    const response = await chainConfigProvider.getFor([oThis.auxChainId]),
      auxChainConfig = response[oThis.auxChainId];

    const wsProviders = auxChainConfig.auxGeth.readWrite.wsProviders;

    const shuffledProviders = basicHelper.shuffleArray(wsProviders);

    oThis.web3Instance = web3Provider.getInstance(shuffledProviders[0]).web3WsProvider;
  }

  /**
   * Set current price in Price oracle contract
   *
   * @return {Promise<Result>}
   */
  async _setPriceInContract() {
    const oThis = this;

    await oThis._setWeb3Instance();

    logger.debug('Price Input for contract:' + oThis.currentOstValue.conversionRate);
    logger.debug('Quote Currency for contract:' + oThis.quoteCurrency);

    const priceResponse = basicHelper.convertToWei(oThis.currentOstValue.conversionRate),
      amountInWei = priceResponse.toString(10);

    logger.debug('Price Point in Wei for contract:' + amountInWei);

    oThis.auxGasPrice = contractConstants.auxChainGasPrice;
    oThis.gas = contractConstants.updatePricePointsGas;

    // Get transaction object.
    const txResponse = new PriceOracleHelper(oThis.web3Instance).setPriceTx(
      oThis.web3Instance,
      conversionRateConstants.OST,
      oThis.quoteCurrency,
      oThis.auxPriceOracleContractAddress,
      amountInWei,
      oThis.auxGasPrice
    );

    // Prepare params for transaction.
    const encodedABI = txResponse.encodedABI,
      txParams = {
        from: oThis.auxPriceOracleContractWorkerAddress,
        to: oThis.auxPriceOracleContractAddress,
        value: coreConstants.zeroValue,
        data: encodedABI,
        gas: oThis.gas,
        gasPrice: oThis.auxGasPrice
      };

    // Submit transaction.
    const submitTransactionResponse = await new SubmitTransaction({
      chainId: oThis.auxChainId,
      txOptions: txParams,
      web3Instance: oThis.web3Instance,
      waitTillReceipt: 1
    }).perform();

    if (submitTransactionResponse && submitTransactionResponse.isFailure()) {
      return Promise.reject(submitTransactionResponse);
    }

    // Fetch required attributes.
    const transactionHash = submitTransactionResponse.data.transactionHash,
      transactionReceipt = submitTransactionResponse.data.transactionReceipt;

    logger.win('\t Transaction hash: ', transactionHash);
    logger.win('\t Transaction receipt: ', transactionReceipt);

    oThis.setPricePointTxHash = transactionHash;
  }

  /**
   * Update Tx Hash in Table
   *
   * @return {Promise<Promise<never> | Promise<any>>}
   *
   * @private
   */
  async _updateTxHashInTable() {
    const oThis = this;

    // Update transaction hash
    const updateTransactionResponse = await new CurrencyConversionRateModel().updateTransactionHash(
      oThis.dbRowId,
      oThis.setPricePointTxHash
    );
    if (!updateTransactionResponse) {
      logger.error('Error while updating transactionHash in table.');

      return Promise.reject();
    }
  }

  /**
   * Compare contract price.
   *
   * @return {Promise<>}
   *
   * @private
   */
  _compareContractPrice() {
    const oThis = this;

    const chainId = oThis.auxChainId,
      dbRowId = oThis.dbRowId,
      conversionRate = oThis.currentOstValue.conversionRate;

    let attemptCountForVerifyPriceInContract = 1;

    return new Promise(function(onResolve, onReject) {
      const loopCompareContractPrice = async function() {
        if (attemptCountForVerifyPriceInContract > oThis.maxRetryCountForVerifyPriceInContract) {
          const errorObject = responseHelper.error({
            internal_error_identifier: 'price_point_not_set:a_s_cr_upp_6',
            api_error_identifier: 'price_point_not_set',
            debug_options: { dbRowId: dbRowId }
          });

          await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);

          return onReject(`dbRowId: ${dbRowId} maxRetryCountForVerifyPriceInContract reached`);
        }

        const priceInDecimal = await new PriceOracleHelper().decimalPrice(
          oThis.web3Instance,
          oThis.auxPriceOracleContractAddress
        );

        if (priceInDecimal.isFailure()) {
          const errorObject = responseHelper.error({
            internal_error_identifier: 'invalid_contract_price_point:a_s_cr_upp_7',
            api_error_identifier: 'invalid_contract_price_point',
            debug_options: { priceInDecimal: priceInDecimal }
          });

          await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);

          return onResolve('error');
        } else if (priceInDecimal.isSuccess() && priceInDecimal.data.price == conversionRate) {
          const queryResp = await new CurrencyConversionRateModel().updateStatus(
            dbRowId,
            conversionRateConstants.active
          );
          if (!queryResp) {
            return onResolve('Failed to update status.');
          }

          logger.win('Price point updated in contract.');

          const clearCacheResponse = new OstPricePointsCache({ chainId: chainId }).clear();
          if (!clearCacheResponse) {
            return onResolve('Failed to clear cache.');
          }

          return onResolve('success');
        }
        logger.step(
          `dbRowId: ${dbRowId} attemptNo: ${attemptCountForVerifyPriceInContract} price received from contract: ${
            priceInDecimal.data.price
          } but expected was: ${conversionRate}. Waiting for it to match.`
        );

        attemptCountForVerifyPriceInContract += attemptCountForVerifyPriceInContract;

        return setTimeout(loopCompareContractPrice, 10000);
      };
      loopCompareContractPrice();
    });
  }
}

module.exports = UpdatePricePoints;
