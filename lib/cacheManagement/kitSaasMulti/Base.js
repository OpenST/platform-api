/**
 * Kit Saas Cache multi-management base
 *
 * @module lib/cacheManagement/kitSaasMulti/Base
 */

const rootPrefix = '../../..',
  ErrorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  SharedMemcachedProvider = require(rootPrefix + '/lib/providers/sharedMemcached'),
  InMemoryCacheProvider = require(rootPrefix + '/lib/providers/inMemoryCache'),
  util = require(rootPrefix + '/lib/util'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  flushFromAllMemcacheInstances = require(rootPrefix + '/lib/flushFromAllMemcacheInstances');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/providers/clientSpecificCacheFactory');

/**
 * Class for cache multi-management base
 *
 * @class CacheManagementKitSaasMultiBase
 */
class CacheManagementKitSaasMultiBase {
  /**
   * Constructor for cache multi-management base
   *
   * @constructor
   */
  constructor() {
    const oThis = this;

    oThis.cacheType = cacheManagementConst.memcached;
    oThis.consistentBehavior = '1';

    oThis.saasCacheKeys = {};
    oThis.kitCacheKeys = {};
    oThis.cacheLevel = null;
    oThis.saasCacheKeyPrefix = null;
    oThis.kitCacheKeyPrefix = null;
    oThis.invertedSaasCacheKeys = {};
    oThis.cacheExpiry = null;
    oThis.cacheImplementer = null;
  }

  /**
   * Set cache implementer.
   *
   * @sets oThis.cacheImplementer
   *
   * @private
   */
  _setCacheImplementer() {
    const oThis = this;

    if (oThis.cacheType === cacheManagementConst.inMemory) {
      oThis.cacheObject = InMemoryCacheProvider.getInstance(oThis.consistentBehavior);
    } else if (oThis.cacheType === cacheManagementConst.sharedMemcached) {
      oThis.cacheObject = SharedMemcachedProvider.getInstance(oThis.consistentBehavior);
    } else {
      throw new Error(`shared_cacheManagement: Invalid cache type: ${oThis.cacheType}`);
    }
    // Set cacheImplementer to perform caching operations
    oThis.cacheImplementer = oThis.cacheObject.cacheInstance;
  }

  /**
   * Set inverted cache keys.
   *
   * @sets oThis.invertedSaasCacheKeys
   *
   * @private
   */
  _setInvertedCacheKeys() {
    const oThis = this;

    oThis.invertedSaasCacheKeys = util.invert(oThis.saasCacheKeys);
  }

  /**
   * Fetch data from cache, in case of cache miss calls sub class method to fetch data from source
   *
   * @returns {Promise<Result>}: On success, data.value has value. On failure, error details returned.
   */
  async fetch() {
    const oThis = this,
      batchSize = 50;

    if (basicHelper.isEmptyObject(oThis.saasCacheKeys)) {
      console.trace('Empty cache keys object in lib/cacheManagement/kitSaasMulti/Base');
    } else {
      logger.debug('CACHE-FETCH## lib/cacheManagement/kitSaasMulti/Base cache keys: ', oThis.saasCacheKeys);
    }

    const data = await oThis._fetchFromCache();
    let fetchDataRsp = null;

    // If there are any cache misses then fetch that data from source.
    while (data.cacheMiss.length > 0) {
      const cacheMissData = data.cacheMiss.splice(0, batchSize);
      fetchDataRsp = await oThis._fetchDataFromSource(cacheMissData);
      // DO NOT WAIT for cache being set
      for (let index = 0; index < cacheMissData.length; index++) {
        const cacheMissFor = cacheMissData[index];

        const dataToSet =
          fetchDataRsp.data[cacheMissFor] || fetchDataRsp.data[cacheMissFor.toString().toLowerCase()] || {};

        data.cachedData[cacheMissFor] = dataToSet;
        oThis._setCache(cacheMissFor, dataToSet);
      }
    }

    return Promise.resolve(responseHelper.successWithData(data.cachedData));
  }

  /**
   * Delete the cache entry.
   *
   * @returns {Promise<void>}
   */
  async clear() {
    const oThis = this,
      promises = [];

    const saasCacheKeys = Object.keys(oThis.saasCacheKeys);

    for (let index = 0; index < saasCacheKeys.length; index++) {
      const saasCacheKey = saasCacheKeys[index];

      promises.push(oThis.cacheImplementer.del(saasCacheKey));
    }

    // Delete all cache only if cache level is kitSaasSubEnvLevel.
    if (oThis.cacheLevel === cacheManagementConst.kitSaasSubEnvLevel) {
      const kitCacheKeys = Object.keys(oThis.kitCacheKeys);

      for (let index = 0; index < kitCacheKeys.length; index++) {
        const kitCacheKey = kitCacheKeys[index];

        promises.push(flushFromAllMemcacheInstances.clearCache(kitCacheKey));
      }
    }

    await Promise.all(promises);
  }

  // Private methods start from here.

  /**
   * Fetch from cache.
   *
   * @returns {object}
   */
  async _fetchFromCache() {
    const oThis = this;

    const cache_keys = Object.keys(oThis.saasCacheKeys),
      cache_miss = [],
      cachedResponse = {},
      batchSize = 500;

    let cacheFetchResponse = null,
      process_cache_keys = [];

    while (cache_keys.length > 0) {
      process_cache_keys = cache_keys.splice(0, batchSize);
      cacheFetchResponse = await oThis.cacheImplementer.multiGet(process_cache_keys);

      if (cacheFetchResponse.isSuccess()) {
        const cachedData = cacheFetchResponse.data.response;
        for (let index = 0; index < process_cache_keys.length; index++) {
          const cacheKey = process_cache_keys[index];
          if (cachedData[cacheKey]) {
            cachedResponse[oThis.saasCacheKeys[cacheKey]] = JSON.parse(cachedData[cacheKey]);
          } else {
            cache_miss.push(oThis.saasCacheKeys[cacheKey]);
          }
        }
      } else {
        logger.error('==>Error while getting from cache: ', cacheFetchResponse.getDebugData());
        for (let index = 0; index < process_cache_keys.length; index++) {
          const cacheKey = process_cache_keys[index];
          cache_miss.push(oThis.saasCacheKeys[cacheKey]);
        }
      }
    }

    return { cacheMiss: cache_miss, cachedData: cachedResponse };
  }

  /**
   * Set data in cache.
   *
   * @param {string} key: key for cache data
   * @param {object} dataToSet: data to set in cache
   *
   * @returns {Result}
   */
  _setCache(key, dataToSet) {
    const oThis = this;

    const setCacheFunction = function(keyToSet, value) {
      const cacheKey = oThis.invertedSaasCacheKeys[keyToSet.toString()];

      return oThis.cacheImplementer.set(cacheKey, JSON.stringify(value), oThis.cacheExpiry);
    };

    setCacheFunction(key, dataToSet).then(function(cacheSetResponse) {
      if (cacheSetResponse.isFailure()) {
        const errorObject = responseHelper.error({
          internal_error_identifier: 'cache_not_set:l_cm_ksm_b_1',
          api_error_identifier: 'cache_not_set',
          debug_options: { cacheSetResponse: cacheSetResponse.getDebugData(), key: key, dataToSet: dataToSet }
        });
        createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.mediumSeverity);
        logger.error('l_cm_ksm_b_1', 'Error in setting cache.', cacheSetResponse.getDebugData());
      }
    });
  }

  /**
   * SAAS cache key prefix.
   *
   * @returns {string}
   */
  _saasCacheKeyPrefix() {
    const oThis = this;

    if (oThis.saasCacheKeyPrefix) {
      return oThis.saasCacheKeyPrefix;
    }
    oThis.saasCacheKeyPrefix = cacheManagementConst.getSaasPrefixForLevel(oThis.cacheLevel);

    return oThis.saasCacheKeyPrefix;
  }

  /**
   * KIT cache key prefix.
   *
   * @returns {string}
   */
  _kitCacheKeyPrefix() {
    const oThis = this;

    if (oThis.kitCacheKeyPrefix) {
      return oThis.kitCacheKeyPrefix;
    }
    oThis.kitCacheKeyPrefix = cacheManagementConst.getKitPrefixForLevel(oThis.cacheLevel);

    return oThis.kitCacheKeyPrefix;
  }

  // Methods which the sub-class would have to implement.

  /**
   * Set cache level in oThis.cacheLevel.
   */
  _setCacheLevel() {
    throw new Error('Sub-class to implement');
  }

  /**
   * Set cache key in oThis.cacheKey and return it.
   *
   * @returns {string}
   */
  _setCacheKeys() {
    throw new Error('Sub-class to implement');
  }

  /**
   * Set cache expiry in oThis.cacheExpiry and return it
   *
   * @returns {Number}
   */
  _setCacheExpiry() {
    throw new Error('Sub-class to implement');
  }

  /**
   * Fetch data from source.
   * NOTES: 1. return should be of klass Result
   *        2. data attr of return is returned and set in cache
   *
   * @returns {Result}
   */
  _fetchDataFromSource() {
    throw new Error('Sub-class to implement');
  }
}

module.exports = CacheManagementKitSaasMultiBase;
