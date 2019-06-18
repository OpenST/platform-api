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
  AllQuoteCurrencySymbols = require(rootPrefix + '/lib/cacheManagement/shared/AllQuoteCurrencySymbols'),
  QuoteCurrencyBySymbolCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/QuoteCurrencyBySymbol'),
  QuoteCurrencyByIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/QuoteCurrencyById'),
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

    await oThis._fetchStakeCurrencyIds();

    await oThis._fetchQuoteCurrencyIds();

    let params = {
      chainId: oThis.chainId,
      stakeCurrencyIds: oThis.stakeCurrencyIds,
      quoteCurrencyIds: oThis.quoteCurrencyIds
    };

    let response = await new CurrencyConversionRateModel().getBaseCurrencyLatestActiveRates(params);

    if (response.isFailure()) {
      logger.error('Failed to fetched data for price point.');
      return Promise.resolve(response);
    }

    let cacheData = response.data,
      missingPricePointKeys = oThis._extractMissingPricePoints(cacheData);

    let retryCount = 2;

    //We call the function again and again till all the base currencies data are not fetched.
    while (missingPricePointKeys.length > 0 && retryCount) {
      let stakeCurrencyIds = [],
        quoteCurrencyIds = [];

      for (let i = 0; i < missingPricePointKeys.length; i++) {
        stakeCurrencyIds.push(missingPricePointKeys[i].stakeCurrencyId);
        quoteCurrencyIds.push(missingPricePointKeys[i].quoteCurrencyId);
      }

      let nextAttemptParams = {
        chainId: oThis.chainId,
        stakeCurrencyIds: stakeCurrencyIds,
        quoteCurrencyIds: quoteCurrencyIds
      };

      let nextAttemptResponse = await new CurrencyConversionRateModel().getBaseCurrencyLatestActiveRates(
        nextAttemptParams
      );

      if (nextAttemptResponse.isFailure()) {
        logger.error('Failed to fetched data for price point.');
        return Promise.resolve(nextAttemptResponse);
      }

      cacheData = Object.assign(cacheData, nextAttemptResponse.data);
      missingPricePointKeys = oThis._extractMissingPricePoints(cacheData);
      retryCount--;
    }

    // if reties exhausted, then error out
    if (missingPricePointKeys.length > 0) {
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_cm_opp_4',
          api_error_identifier: 'something_went_wrong',
          debug_data: { chainId: oThis.chainId },
          error_config: errorConfig
        })
      );
    }

    // Replace ids with quote currency symbols
    let quoteCurrencyByIdCache = new QuoteCurrencyByIdCache({
      quoteCurrencyIds: oThis.quoteCurrencyIds
    });

    let cacheRsp = await quoteCurrencyByIdCache.fetch();

    let quoteCurrencyData = cacheRsp.data;

    for (let stakeCurrencyId in cacheData) {
      for (let quoteCurrencyId in cacheData[stakeCurrencyId]) {
        if (quoteCurrencyId == 'updated_timestamp') {
          continue;
        }

        let quoteCurrencySymbol = quoteCurrencyData[quoteCurrencyId].symbol;

        cacheData[stakeCurrencyId][quoteCurrencySymbol] = cacheData[stakeCurrencyId][quoteCurrencyId];
        delete cacheData[stakeCurrencyId][quoteCurrencyId];
      }
    }

    return Promise.resolve(responseHelper.successWithData(cacheData));
  }

  /**
   * Fetch stake currency ids
   *
   * @return {Promise<never>}
   * @private
   */
  async _fetchStakeCurrencyIds() {
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
  }

  /**
   * Fetch quote currency ids
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchQuoteCurrencyIds() {
    const oThis = this;

    let allQuoteCurrencySymbols = new AllQuoteCurrencySymbols({});

    let cacheRsp = await allQuoteCurrencySymbols.fetch();

    let quoteCurrencies = cacheRsp.data;

    let quoteCurrencyBySymbolCache = new QuoteCurrencyBySymbolCache({
      quoteCurrencySymbols: quoteCurrencies
    });

    let quoteCurrencyCacheRsp = await quoteCurrencyBySymbolCache.fetch();

    let quoteCurrencyData = quoteCurrencyCacheRsp.data;

    oThis.quoteCurrencyIds = [];
    for (let quoteCurrency in quoteCurrencyData) {
      oThis.quoteCurrencyIds.push(quoteCurrencyData[quoteCurrency].id);
    }
  }

  /**
   * This function returns an array of stake currency ids whose data was not present in the response.
   *
   * @param {Object} pricePointsData
   * @returns {Array}
   * @private
   */
  _extractMissingPricePoints(pricePointsData) {
    const oThis = this;

    let missingPricePointKeys = [];

    for (let i = 0; i < oThis.stakeCurrencyIds.length; i++) {
      for (let qInd = 0; qInd < oThis.quoteCurrencyIds.length; qInd++) {
        if (
          !(
            pricePointsData.hasOwnProperty(oThis.stakeCurrencyIds[i]) ||
            !pricePointsData[oThis.stakeCurrencyIds[i]].hasOwnProperty(oThis.quoteCurrencyIds[qInd])
          )
        ) {
          missingPricePointKeys.push({
            stakeCurrencyId: oThis.stakeCurrencyIds[i],
            quoteCurrencyId: oThis.quoteCurrencyIds[qInd]
          });
        }
      }
    }

    return missingPricePointKeys;
  }
}

module.exports = OstPricePointsCache;
