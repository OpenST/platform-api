/**
 * Module to fetch price point From CoinMarketCap Api.
 *
 * @module lib/updatePricePoints/FetchPricePointFromCoinMarketCapApi
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer,
  requestPromise = require('request-promise'),
  exchangeUrl = 'https://api.coinmarketcap.com/v1/ticker/';

const rootPrefix = '../..',
  ErrorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  StakeCurrencyBySymbolCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyBySymbol'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  conversionRateConstants = require(rootPrefix + '/lib/globalConstant/conversionRates');

/**
 * Class to to fetch price point From CoinMarketCap Api.
 *
 * @class FetchPricePointFromCoinMarketCapApi
 */
class FetchPricePointFromCoinMarketCapApi {
  /**
   * Constructor to fetch price point From CoinMarketCap Api.
   *
   * @param {object} params
   * @param {string} params.baseCurrency: baseCurrency
   * @param {string} [params.quoteCurrency]: quoteCurrency
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.quoteCurrency = params.quoteCurrency;
    oThis.baseCurrency = params.baseCurrency;

    oThis.currentErc20Value = null;
    oThis.stakeCurrencyDetails = null;
    oThis.currentTime = Math.floor(new Date().getTime() / 1000);
  }

  /**
   * Main performer of the class.
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis._fetchStakeCurrencyDetails();

    await oThis._fetchPricePointFromCoinMarketCapApi();

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone,
        taskResponseData: {
          currentErc20Value: oThis.currentErc20Value
        },
        debugParams: {
          currentTime: oThis.currentTime
        }
      })
    );
  }

  /**
   * This function fetches stake currency details.
   *
   * @sets oThis.stakeCurrencyDetails
   *
   * @private
   */
  async _fetchStakeCurrencyDetails() {
    const oThis = this;

    const stakeCurrencyCacheResponse = await new StakeCurrencyBySymbolCache({
      stakeCurrencySymbols: [oThis.baseCurrency]
    }).fetch();

    if (stakeCurrencyCacheResponse.isFailure()) {
      return Promise.reject(stakeCurrencyCacheResponse);
    }

    oThis.stakeCurrencyDetails = stakeCurrencyCacheResponse.data[oThis.baseCurrency];
  }

  /**
   * Parse response from CoinMarketCap.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchPricePointFromCoinMarketCapApi() {
    const oThis = this;
    const url =
      exchangeUrl +
      oThis.stakeCurrencyDetails['constants']['prefixToFetchPriceFromCoinMarketCap'] +
      '?convert=' +
      oThis.quoteCurrency;

    // Make CoinMarketCap API call.
    const coinMarketCapApiResponse = await requestPromise(url);

    try {
      const currentErc20ValueRsp = JSON.parse(coinMarketCapApiResponse)[0];
      logger.debug(oThis.baseCurrency, 'value From CoinMarketCap:', currentErc20ValueRsp);
      if (!currentErc20ValueRsp || !currentErc20ValueRsp.symbol) {
        const errorObject = responseHelper.error({
          internal_error_identifier: 'invalid_erc20_value:l_upp_fppcmca_1',
          api_error_identifier: 'invalid_erc20_value',
          debug_options: { erc20Value: currentErc20ValueRsp }
        });

        await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);

        return;
      }
      const pricePoint = currentErc20ValueRsp['price_' + oThis.quoteCurrency.toLowerCase()];
      if (!pricePoint || pricePoint < 0) {
        const errorObject = responseHelper.error({
          internal_error_identifier: 'invalid_erc20_price:l_upp_fppcmca_2',
          api_error_identifier: 'invalid_erc20_price',
          debug_options: { pricePoint: pricePoint }
        });

        await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);

        return;
      }

      oThis.currentErc20Value = {
        baseCurrency: oThis.baseCurrency,
        quoteCurrency: oThis.quoteCurrency,
        conversionRate: pricePoint,
        timestamp: oThis.currentTime,
        status: conversionRateConstants.inProcess
      };
    } catch (err) {
      const errorObject = responseHelper.error({
        internal_error_identifier: 'invalid_cmc_response:l_upp_fppcmca_3',
        api_error_identifier: 'invalid_cmc_response',
        debug_options: { cmcResponse: coinMarketCapApiResponse }
      });

      await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);
    }
  }
}

InstanceComposer.registerAsShadowableClass(
  FetchPricePointFromCoinMarketCapApi,
  coreConstants.icNameSpace,
  'FetchPricePointFromCoinMarketCapApi'
);

module.exports = {};
