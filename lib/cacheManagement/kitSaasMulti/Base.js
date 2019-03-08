/**
 * Kit Saas Cache multi-management base
 *
 * @module lib/cacheManagement/kitSaasMulti/Base
 */

const rootPrefix = '../../..',
  SharedMemcachedProvider = require(rootPrefix + '/lib/providers/sharedMemcached'),
  util = require(rootPrefix + '/lib/util'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

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

    oThis.cacheKeys = {};
    oThis.cacheLevel = null;
    oThis.cacheKeyPrefix = null;
    oThis.invertedCacheKeys = {};
    oThis.cacheExpiry = null;
    oThis.cacheImplementer = null;
  }

  /**
   * Set cache implementer in oThis.cacheExpiry and return it
   *
   * @returns {Number}
   */
  _setCacheImplementer() {
    const oThis = this;

    oThis.cacheObject = SharedMemcachedProvider.getInstance(oThis.consistentBehavior);
    // Set cacheImplementer to perform caching operations
    oThis.cacheImplementer = oThis.cacheObject.cacheInstance;
  }

  /**
   * Set inverted cache keys
   *
   * @private
   */
  _setInvertedCacheKeys() {
    const oThis = this;

    oThis.invertedCacheKeys = util.invert(oThis.cacheKeys);
  }

  /**
   * Fetch data from cache, in case of cache miss calls sub class method to fetch data from source
   *
   * @returns {Promise<Result>}: On success, data.value has value. On failure, error details returned.
   */
  async fetch() {
    const oThis = this,
      batchSize = 50;

    logger.debug('CACHE-FETCH## cache key: ', oThis.cacheKeys);

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
   * Delete the cache entry
   *
   * @returns {Promise<*>}
   */
  async clear() {
    const oThis = this;

    for (let index = 0; index < Object.keys(oThis.cacheKeys).length; index++) {
      const cacheKey = Object.keys(oThis.cacheKeys)[index];

      oThis.cacheImplementer.del(cacheKey);
    }
  }

  // Private methods start from here

  /**
   * Fetch from cache
   *
   * @returns {Object}
   */
  async _fetchFromCache() {
    const oThis = this;
    const cache_keys = Object.keys(oThis.cacheKeys),
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
            cachedResponse[oThis.cacheKeys[cacheKey]] = JSON.parse(cachedData[cacheKey]);
          } else {
            cache_miss.push(oThis.cacheKeys[cacheKey]);
          }
        }
      } else {
        logger.error('==>Error while getting from cache: ', cacheFetchResponse.getDebugData());
        for (let index = 0; index < process_cache_keys.length; index++) {
          const cacheKey = process_cache_keys[index];
          cache_miss.push(oThis.cacheKeys[cacheKey]);
        }
      }
    }

    return { cacheMiss: cache_miss, cachedData: cachedResponse };
  }

  /**
   * Set data in cache.
   *
   * @param {String} key: key for cache data
   * @param {Object} dataToSet: data to set in cache
   *
   * @returns {Result}
   */
  _setCache(key, dataToSet) {
    const oThis = this;

    const setCacheFunction = function(keyToSet, value) {
      const cacheKey = oThis.invertedCacheKeys[keyToSet.toString()];

      return oThis.cacheImplementer.set(cacheKey, JSON.stringify(value), oThis.cacheExpiry);
    };

    setCacheFunction(key, dataToSet).then((cacheSetResponse) => {
      if (cacheSetResponse.isFailure()) {
        basicHelper.notify('l_cm_ksm_b_1', 'Error in setting cache.', {}, cacheSetResponse.getDebugData());
        logger.error('l_cm_ksm_b_2', 'Error in setting cache.', cacheSetResponse.getDebugData());
      }
    });
  }

  /**
   * Cache key prefix
   *
   * @returns {String}
   */
  _cacheKeyPrefix() {
    const oThis = this;
    if (oThis.cacheKeyPrefix) {
      return oThis.cacheKeyPrefix;
    }
    oThis.cacheKeyPrefix = cacheManagementConst.getSaasPrefixForLevel(oThis.cacheLevel);

    return oThis.cacheKeyPrefix;
  }

  // Methods which the sub-class would have to implement

  /**
   * Set cache level in oThis.cacheLevel
   */
  _setCacheLevel() {
    throw new Error('Sub-class to implement');
  }

  /**
   * Set cache key in oThis.cacheKey and return it
   *
   * @returns {String}
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
