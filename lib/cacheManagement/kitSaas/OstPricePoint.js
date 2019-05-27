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
  CurrencyConversionRateModel = require(rootPrefix + '/app/models/mysql/CurrencyConversionRate'),
  AllStakeCurrencySymbolsCache = require(rootPrefix + '/lib/cacheManagement/shared/AllStakeCurrencySymbols'),
  StakeCurrencyBySymbolCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyBySymbol'),
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

    const stakeCurrencySymbolsRsp = await new AllStakeCurrencySymbolsCache().fetch();

    if (stakeCurrencySymbolsRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_cm_opp_3',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    let stakeCurrencySymbols = stakeCurrencySymbolsRsp.data;

    // Fetch stake currency ids
    let stakeCurrencyBySymbolCache = new StakeCurrencyBySymbolCache({
      stakeCurrencySymbols: stakeCurrencySymbols
    });

    let stakeCurrencyBySymbolCacheRsp = await stakeCurrencyBySymbolCache.fetch(),
      stakeCurrencyData = stakeCurrencyBySymbolCacheRsp.data;

    oThis.stakeCurrencyIds = [];

    for (let i = 0; i < stakeCurrencySymbols.length; i++) {
      let symbol = stakeCurrencySymbols[i];
      if (stakeCurrencyData.hasOwnProperty(symbol)) {
        oThis.stakeCurrencyIds.push(stakeCurrencyData[symbol].id);
      }
    }

    let params = {
      chainId: oThis.chainId,
      stakeCurrencyIds: oThis.stakeCurrencyIds
    };

    let response = await new CurrencyConversionRateModel().getBaseCurrencyLatestActiveRates(params);

    if (response.isFailure()) {
      logger.error('Failed to fetched data for price point.');
      return Promise.resolve(response);
    }

    let cacheData = response.data,
      missingStakeCurrencyIds = oThis._extractMissingStakeCurrencyIds(cacheData);

    let retryCount = 2;

    //We call the function again and again till all the base currencies data are not fetched.
    while (missingStakeCurrencyIds.length > 0 && retryCount) {
      let nextAttemptParams = {
        chainId: oThis.chainId,
        stakeCurrencyIds: missingStakeCurrencyIds
      };

      let nextAttemptResponse = await new CurrencyConversionRateModel().getBaseCurrencyLatestActiveRates(
        nextAttemptParams
      );

      if (nextAttemptResponse.isFailure()) {
        logger.error('Failed to fetched data for price point.');
        return Promise.resolve(nextAttemptResponse);
      }

      cacheData = Object.assign(cacheData, nextAttemptResponse.data);
      missingStakeCurrencyIds = oThis._extractMissingBaseCurrencies(cacheData);
      retryCount--;
    }

    // if reties exhausted, then error out
    if (missingStakeCurrencyIds.length > 0) {
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_cm_opp_4',
          api_error_identifier: 'something_went_wrong',
          debug_data: { chainId: oThis.chainId },
          error_config: errorConfig
        })
      );
    }

    return Promise.resolve(responseHelper.successWithData(cacheData));
  }

  /**
   * This function returns an array of stake currency ids whose data was not present in the response.
   *
   * @param {Object} pricePointsData
   * @returns {Array}
   * @private
   */
  _extractMissingStakeCurrencyIds(pricePointsData) {
    const oThis = this;

    let missingStakeCurrencyIds = [];

    for (let i = 0; i < oThis.stakeCurrencyIds.length; i++) {
      if (!pricePointsData.hasOwnProperty(oThis.stakeCurrencyIds[i])) {
        missingStakeCurrencyIds.push(oThis.stakeCurrencyIds[i]);
      }
    }

    return missingStakeCurrencyIds;
  }
}

module.exports = OstPricePointsCache;
