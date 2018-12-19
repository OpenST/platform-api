'use strict';

const rootPrefix = '../..',
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  baseCache = require(rootPrefix + '/lib/cacheManagement/base'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  FlushSharedMemcached = require(rootPrefix + '/lib/sharedCacheManagement/FlushSharedMemcached'),
  CurrencyConversionRateModel = require(rootPrefix + '/app/models/mysql/CurrencyConversionRate'),
  conversionRatesConstants = require(rootPrefix + '/lib/globalConstant/conversionRates'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions');

const errorConfig = basicHelper.fetchErrorConfig(apiVersions.general),
  InstanceComposer = OSTBase.InstanceComposer;

/**
 * @constructor
 * @augments baseCache
 */
class OstPricePointsCache extends baseCache {
  constructor() {
    super(params);

    const oThis = this;

    oThis.cacheType = cacheManagementConst.memcached;
    oThis.consistentBehavior = '1';

    baseCache.call(this, {});
    oThis.useObject = true;
  }

  /**
   * set cache key
   *
   * @return {String}
   */
  setCacheKey() {
    const oThis = this,
      configStrategy = oThis.ic().configStrategy;

    oThis.cacheKey = oThis._cacheKeyPrefix() + 'c_ost_pp_' + configStrategy.auxGeth.chainId;

    return oThis.cacheKey;
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   *
   * @return {Number}
   */
  setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 600; // 10 minutes

    return oThis.cacheExpiry;
  }

  /**
   * clear cache
   *
   * @return {Promise<Result>}
   */
  clear() {
    const oThis = this,
      configStrategy = oThis.ic().configStrategy,
      chainId = configStrategy.auxGeth.chainId;

    const flushSharedMemcached = new FlushSharedMemcached();
    flushSharedMemcached.clearCache(
      coreConstants.SHARED_MEMCACHE_KEY_PREFIX + coreConstants.ENVIRONMENT_SHORT + '_sa_c_ost_pp_' + chainId
    );

    return oThis.cacheImplementer.del(oThis.cacheKey);
  }

  /**
   * fetch data from source
   *
   * @return {Result}
   */
  async fetchDataFromSource() {
    const oThis = this,
      configStrategy = oThis.ic().configStrategy;

    let cacheData = {},
      hasData = false;
    cacheData[conversionRatesConstants.OST] = {};

    for (let key in conversionRatesConstants.quoteCurrencies) {
      let chainId = configStrategy.auxGeth.chainId,
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

InstanceComposer.registerAsShadowableClass(OstPricePointsCache, coreConstants.icNameSpace, 'OstPricePointsCache');

module.exports = OstPricePointsCache;
