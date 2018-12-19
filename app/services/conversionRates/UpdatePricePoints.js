'use strict';

/**
 * Fetch OST Current price in given currency from coin market cap and set in price oracle.
 *
 * @module app/services/conversionRates/UpdatePricePoints
 */

const requestPromise = require('request-promise'),
  BigNumber = require('bignumber.js'),
  exchangeUrl = 'https://api.coinmarketcap.com/v1/ticker/simple-token';

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  CurrencyConversionRateModel = require(rootPrefix + '/app/models/mysql/CurrencyConversionRate'),
  conversionRateConstants = require(rootPrefix + '/lib/globalConstant/conversionRates');

const InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/lib/providers/priceOracle');
require(rootPrefix + '/lib/cacheManagement/OstPricePoints');

class UpdatePricePoints {
  /**
   * Fetch OST Current price
   *
   * @param {object} params -
   * @param {string} params.currency - Currency to fetch price in. eg: (USD or EUR)
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.quoteCurrency = params.currency || conversionRateConstants.USD;
    oThis.currentTime = Math.floor(new Date().getTime() / 1000);
    oThis.currentOstValue = null;
    oThis.maxRetryCountForVerifyPriceInContract = 100;
  }

  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('app/services/conversionRates/UpdatePricePoints.js::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'a_s_cr_upp_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * Perform<br><br>
   *
   * @return {promise<result>} - returns a promise which resolves to an object of kind Result
   */
  async asyncPerform() {
    const oThis = this,
      configStrategy = oThis.ic().configStrategy;

    // Parse Coinmarketcap api response
    await oThis._parseResponse();

    // Insert current ost value in database
    const insertResponse = await new CurrencyConversionRateModel()
      .insert({
        chain_id: configStrategy.auxGeth.chainId,
        base_currency: conversionRateConstants.invertedBaseCurrencies[oThis.currentOstValue.baseCurrency],
        quote_currency: conversionRateConstants.invertedQuoteCurrencies[oThis.currentOstValue.quoteCurrency],
        conversion_rate: oThis.currentOstValue.conversionRate,
        timestamp: oThis.currentTime,
        status: conversionRateConstants.invertedStatuses[oThis.currentOstValue.status]
      })
      .fire();

    oThis.dbRowId = insertResponse.insertId;

    // Set current price in contract
    let contractResponse = await oThis._setPriceInContract();
    if (contractResponse.isFailure()) {
      logger.notify('a_s_cr_upp_2', 'Error while setting price in contract.', response);

      return;
    }
    let transactionHash = contractResponse.data.transactionHash;

    // Update transaction hash
    let updateTransactionResponse = await new CurrencyConversionRateModel().updateTransactionHash(
      oThis.dbRowId,
      transactionHash
    );
    logger.debug(updateTransactionResponse);

    //Keep on checking for a price in contract whether its set to new value.
    return oThis._compareContractPrice();
  }

  /**
   * Parse Response from coinmarketcap
   *
   * Sets currentOstValue
   */
  async _parseResponse() {
    const oThis = this;
    let url = exchangeUrl + '?convert=' + oThis.quoteCurrency;

    // Make coinmarketcap api call
    let response = await requestPromise(url);

    try {
      let ostValue = JSON.parse(response)[0];
      logger.debug('OST Value From CoinMarketCap:', ostValue);
      if (!ostValue || ostValue.symbol != conversionRateConstants.OST) {
        logger.notify('a_s_cr_upp_3', 'Invalid OST Value', response);

        return;
      }
      let pricePoint = ostValue['price_' + oThis.quoteCurrency.toLowerCase()];
      if (!pricePoint || pricePoint < 0) {
        logger.notify('a_s_cr_upp_4', 'Invalid OST Price', response);

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
      logger.notify('a_s_cr_upp_5', 'Invalid Response from CoinMarket', response);
    }
  }

  /**
   * Set current price in Price oracle contract
   *
   * @return {Promise<Result>}
   */
  _setPriceInContract() {
    const oThis = this,
      configStrategy = oThis.ic().configStrategy,
      priceOracleProvider = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'getPriceOracleProvider'),
      priceOracle = priceOracleProvider.getInstance().priceOracle;

    logger.debug('Price Input for contract:' + oThis.currentOstValue.conversionRate);

    let conversionRateBigNumber = new BigNumber(oThis.currentOstValue.conversionRate);

    logger.debug('Quote Currency for contract:' + oThis.quoteCurrency);

    let priceResponse = priceOracle.fixedPointIntegerPrice(conversionRateBigNumber.toNumber());
    if (priceResponse.isFailure()) {
      return Promise.resolve(priceResponse);
    }

    let amountInWei = priceResponse.data.price.toNumber();
    logger.debug('Price Point in Wei for contract:' + amountInWei);

    return priceOracle.setPrice(
      configStrategy.auxGeth.chainId,
      conversionRateConstants.OST,
      oThis.quoteCurrency,
      amountInWei,
      configStrategy.auxConstants.auxGasPrice
    );
  }

  /**
   *
   * @return {Promise<>}
   * @private
   */
  _compareContractPrice() {
    const oThis = this;

    let configStrategy = oThis.ic().configStrategy,
      chainId = configStrategy.auxGeth.chainId,
      conversionRate = oThis.currentOstValue.conversionRate,
      dbRowId = oThis.dbRowId,
      attemptCountForVerifyPriceInContract = 1;

    let priceOracleProvider = oThis.ic().getInstanceFor(coreConstants.icNameSpace, 'getPriceOracleProvider'),
      priceOracle = priceOracleProvider.getInstance().priceOracle,
      ostPriceCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'getOstPricePointsCache');

    return new Promise(function(onResolve, onReject) {
      let loopCompareContractPrice = async function() {
        if (attemptCountForVerifyPriceInContract > oThis.maxRetryCountForVerifyPriceInContract) {
          logger.notify('a_s_cr_upp_6', 'Something Is Wrong', {
            dbRowId: dbRowId
          });
          return onReject(`dbRowId: ${dbRowId} maxRetryCountForVerifyPriceInContract reached`);
        }

        let priceInDecimal = await priceOracle.decimalPrice(chainId, conversionRateConstants.OST, oThis.quoteCurrency);

        if (priceInDecimal.isFailure()) {
          logger.notify('a_s_cr_upp_7', 'Error while getting price from contract.', priceInDecimal);
          return onResolve('error');
        } else if (priceInDecimal.isSuccess() && priceInDecimal.data.price == conversionRate) {
          await new CurrencyConversionRateModel().updateStatus(dbRowId, conversionRateConstants.active);
          new ostPriceCache().clear();
          logger.win('Price point updated in contract.');

          return onResolve('success');
        } else {
          logger.step(
            `dbRowId: ${dbRowId} attemptNo: ${attemptCountForVerifyPriceInContract} price received from contract: ${
              priceInDecimal.data.price
            } but expected was: ${conversionRate}. Waiting for it to match.`
          );

          attemptCountForVerifyPriceInContract += attemptCountForVerifyPriceInContract;

          return setTimeout(loopCompareContractPrice, 10000);
        }
      };

      loopCompareContractPrice();
    });
  }
}

InstanceComposer.registerAsShadowableClass(UpdatePricePoints, coreConstants.icNameSpace, 'UpdatePricePoints');

module.exports = UpdatePricePoints;
