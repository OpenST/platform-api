/**
 * Fetch Price Point From CoinMarketCap Api.
 *
 * @module lib/updatePricePoints/FetchPricePointFromCoinMarketCapApi
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer,
  requestPromise = require('request-promise'),
  exchangeUrl = 'https://api.coinmarketcap.com/v1/ticker/simple-token';

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  ErrorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  conversionRateConstants = require(rootPrefix + '/lib/globalConstant/conversionRates');

/**
 * Class to Fetch Price Point From CoinMarketCap Api.
 *
 * @class
 */
class FetchPricePointFromCoinMarketCapApi {
  /**
   * Constructor to Fetch Price Point From CoinMarketCap Api.
   *
   * @param {Object} params
   * @param {String} [params.quoteCurrency] - quoteCurrency (optional)
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.quoteCurrency = params.quoteCurrency || conversionRateConstants.USD;
    oThis.currentOstValue = null;
    oThis.currentTime = Math.floor(new Date().getTime() / 1000);
  }

  /**
   * Main performer of the class.
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis._fetchPricePointFromCoinMarketCapApi();

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone,
        taskResponseData: {
          currentOstValue: oThis.currentOstValue
        },
        debugParams: {
          currentTime: oThis.currentTime
        }
      })
    );
  }

  /**
   * Parse Response from CoinMarketCap
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchPricePointFromCoinMarketCapApi() {
    const oThis = this;
    const url = exchangeUrl + '?convert=' + oThis.quoteCurrency;

    // Make CoinMarketCap API call.
    const coinMarketCapApiResponse = await requestPromise(url);

    try {
      const currentOstValueRsp = JSON.parse(coinMarketCapApiResponse)[0];
      logger.debug('OST Value From CoinMarketCap:', currentOstValueRsp);
      if (!currentOstValueRsp || currentOstValueRsp.symbol !== 'OST') {
        const errorObject = responseHelper.error({
          internal_error_identifier: 'invalid_ost_value:l_upp_fppcmca_1',
          api_error_identifier: 'invalid_ost_value',
          debug_options: { ostValue: currentOstValueRsp }
        });

        await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);

        return;
      }
      const pricePoint = currentOstValueRsp['price_' + oThis.quoteCurrency.toLowerCase()];
      if (!pricePoint || pricePoint < 0) {
        const errorObject = responseHelper.error({
          internal_error_identifier: 'invalid_ost_price:l_upp_fppcmca_2',
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
