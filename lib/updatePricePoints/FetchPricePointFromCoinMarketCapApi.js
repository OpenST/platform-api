/**
 * Fetch Price Point From CoinMarketCap Api.
 *
 * @module lib/updatePricePoints/FetchPricePointFromCoinMarketCapApi
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer,
  requestPromise = require('request-promise'),
  exchangeUrl = 'https://api.coinmarketcap.com/v1/ticker/';

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
   * @param {String} [params.baseCurrency]  - baseCurrency (optional)
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.quoteCurrency = params.quoteCurrency || conversionRateConstants.USD;
    oThis.baseCurrency = params.baseCurrency;
    oThis.currentErc20Value = null;
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
          currentErc20Value: oThis.currentErc20Value
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
    const url =
      exchangeUrl + conversionRateConstants.symbolToNameMap[oThis.baseCurrency] + '?convert=' + oThis.quoteCurrency;

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
