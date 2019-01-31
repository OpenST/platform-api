'use strict';
/**
 * Cache class for ost price points.
 *
 * @module lib/kitSaasSharedCacheManagement/OstPricePoints
 */
const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  BaseCacheManagement = require(rootPrefix + '/lib/kitSaasSharedCacheManagement/Base'),
  conversionRatesConstants = require(rootPrefix + '/lib/globalConstant/conversionRates'),
  CurrencyConversionRateModel = require(rootPrefix + '/app/models/mysql/CurrencyConversionRate'),
  errorConfig = basicHelper.fetchErrorConfig(apiVersions.general);

/**
 * Class for ost price points cache.
 *
 * @class
 */
class OstPricePointsCache extends BaseCacheManagement {
  /**
   * Constructor for ost price points cache.
   *
   * @param {Object} params
   * @param {String/Number} params.chainId
   *
   * @augments baseCache
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.chainId = params.chainId;

    // Call sub class method to set cache level
    oThis._setCacheLevel();

    // Call sub class method to set cache key using params provided
    oThis._setCacheKeySuffix();

    // Call sub class method to set cache expiry using params provided
    oThis._setCacheExpiry();

    // Call sub class method to set cache implementer using params provided
    oThis._setCacheImplementer();
  }

  /**
   * Set cache level
   *
   * @private
   */
  _setCacheLevel() {
    const oThis = this;
    oThis.cacheLevel = cacheManagementConst.kitSaasSubEnvLevel;
  }

  /**
   * Set cache keys.
   */
  _setCacheKeySuffix() {
    const oThis = this;
    oThis.cacheKeySuffix = 'c_ost_pp_' + oThis.chainId;
  }

  /**
   * Set cache expiry in oThis.cacheExpiry and return it
   *
   * @return {Number}
   */
  _setCacheExpiry() {
    const oThis = this;
    oThis.cacheExpiry = 24 * 60 * 60; // 24 hours ;
    return oThis.cacheExpiry;
  }

  /**
   * Fetch data from source
   *
   * @return {Result}
   */
  async _fetchDataFromSource() {
    const oThis = this,
      cacheData = {};

    let hasData = false;

    cacheData[conversionRatesConstants.OST] = {};

    for (let key in conversionRatesConstants.quoteCurrencies) {
      let chainId = oThis.chainId,
        currency = conversionRatesConstants.quoteCurrencies[key];

      let response = await new CurrencyConversionRateModel().getLastActiveRates(chainId, currency);

      if (response[0]) {
        hasData = true;
        cacheData[conversionRatesConstants.OST][currency] = response[0].conversion_rate;
      }
    }

    if (!hasData) {
      logger.error('Failed to fetched data for price point.');
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_cm_opp_1',
          api_error_identifier: 'invalid_params',
          error_config: errorConfig
        })
      );
    }

    return Promise.resolve(responseHelper.successWithData(cacheData));
  }
}

module.exports = OstPricePointsCache;
