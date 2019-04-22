'use strict';
/**
 * Cache class for ost price points.
 *
 * @module lib/cacheManagement/kitSaas/OstPricePoint
 */
const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  BaseCacheManagement = require(rootPrefix + '/lib/cacheManagement/kitSaas/Base'),
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
    const oThis = this;

    let baseCurrenciesArray = Object.values(conversionRatesConstants.baseCurrencies),
      params = {
        chainId: oThis.chainId,
        baseCurrencies: baseCurrenciesArray
      };

    let response = await new CurrencyConversionRateModel().getBaseCurrencyLatestActiveRates(params);

    if (response.isFailure()) {
      logger.error('Failed to fetched data for price point.');
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_cm_opp_1',
          api_error_identifier: 'invalid_params',
          debug_data: { chainId: oThis.chainId },
          error_config: errorConfig
        })
      );
    }

    let cacheData = response.data,
      missingBaseCurrenciesArray = oThis._extractMissingBaseCurrencies(cacheData);

    //We call the function again and again till all the base currencies data are not fetched.
    while (missingBaseCurrenciesArray.length > 0) {
      let nextAttemptParams = {
        chainId: oThis.chainId,
        baseCurrencies: missingBaseCurrenciesArray
      };

      let nextAttemptResponse = await new CurrencyConversionRateModel().getBaseCurrencyLatestActiveRates(
        nextAttemptParams
      );

      if (nextAttemptResponse.isFailure()) {
        logger.error('Failed to fetched data for price point.');
        return Promise.resolve(
          responseHelper.error({
            internal_error_identifier: 'l_cm_opp_2',
            api_error_identifier: 'invalid_params',
            debug_data: { chainId: oThis.chainId },
            error_config: errorConfig
          })
        );
      }

      missingBaseCurrenciesArray = oThis._extractMissingBaseCurrencies(nextAttemptResponse.data);
      cacheData = Object.assign(cacheData, nextAttemptResponse.data);
    }

    return Promise.resolve(responseHelper.successWithData(cacheData));
  }

  /**
   * This function returns an array of base currencies whose data was not present in the response.
   *
   * @param {Object} response
   * @returns {Array}
   * @private
   */
  _extractMissingBaseCurrencies(response) {
    let pricePointsData = response,
      duplicateBaseCurrencies = conversionRatesConstants.invertedBaseCurrencies;

    for (let currency in pricePointsData) {
      delete duplicateBaseCurrencies[currency];
    }

    return Object.keys(duplicateBaseCurrencies);
  }
}

module.exports = OstPricePointsCache;
