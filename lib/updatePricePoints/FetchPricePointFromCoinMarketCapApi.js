const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer,
  requestPromise = require('request-promise');

const rootPrefix = '../..',
  StakeCurrencyBySymbolCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyBySymbol'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  conversionRateConstants = require(rootPrefix + '/lib/globalConstant/conversionRates');

// Declare constants.
const s3FileUrl = coreConstants.SA_S3_PRICEPOINTS_URL;

/**
 * Class to fetch price points from S3 bucket.
 *
 * @class FetchPricePointFromCoinMarketCapApi
 */
class FetchPricePointFromCoinMarketCapApi {
  /**
   * Constructor to fetch price points from S3 bucket.
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
    oThis.setOldValuesInContract = false;
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
          currentErc20Value: oThis.currentErc20Value,
          setOldValuesInContract: oThis.setOldValuesInContract
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
      s3FileUrl +
      '/' +
      oThis.stakeCurrencyDetails.constants.prefixToFetchPriceFromCoinMarketCap +
      '/' +
      oThis.quoteCurrency.toLowerCase() +
      '.json';

    oThis.currentErc20Value = {
      baseCurrency: oThis.baseCurrency,
      quoteCurrency: oThis.quoteCurrency,
      timestamp: oThis.currentTime,
      status: conversionRateConstants.inProcess
    };

    try {
      // Make CoinMarketCap API call.
      const coinMarketCapApiResponse = await requestPromise(url);
      const currentErc20ValueRsp = JSON.parse(coinMarketCapApiResponse);
      logger.debug(oThis.baseCurrency, 'value From CoinMarketCap:', currentErc20ValueRsp);
      if (
        !currentErc20ValueRsp ||
        !currentErc20ValueRsp[oThis.stakeCurrencyDetails.constants.prefixToFetchPriceFromCoinMarketCap]
      ) {
        logger.error('Error in fetching data from coinMarketCap: ', currentErc20ValueRsp);
        oThis.setOldValuesInContract = true;

        return;
      }
      const pricePoint =
        currentErc20ValueRsp[oThis.stakeCurrencyDetails.constants.prefixToFetchPriceFromCoinMarketCap][
          oThis.quoteCurrency.toLowerCase()
        ];
      if (!pricePoint || pricePoint < 0) {
        logger.error('Error in fetching data from coinMarketCap, pricePoint not found: ', currentErc20ValueRsp);
        oThis.setOldValuesInContract = true;

        return;
      }

      oThis.currentErc20Value.conversionRate = pricePoint;
    } catch (err) {
      logger.error('Error in fetching data from coinMarketCap: ', err);
      oThis.setOldValuesInContract = true;
    }
  }
}

InstanceComposer.registerAsShadowableClass(
  FetchPricePointFromCoinMarketCapApi,
  coreConstants.icNameSpace,
  'FetchPricePointFromCoinMarketCapApi'
);

module.exports = {};
