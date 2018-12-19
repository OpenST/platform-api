'use strict';

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  InMemoryCacheProvider = require(rootPrefix + '/lib/providers/inMemoryCache'),
  SharedMemcachedProvider = require(rootPrefix + '/lib/providers/sharedMemcached'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

/**
 * constructor
 *
 * @param {Object} params - cache key generation & expiry related params
 *
 * @constructor
 */
// const BaseSharedCacheMultiManagementKlass = function(params) {
//   const oThis = this;
//
//   if (!params) {
//     params = {};
//   }
//
//   oThis.params = params;
//
//   oThis.cacheKeys = {};
//
//   oThis.cacheObject = null;
//
//   if (oThis.cacheType === cacheManagementConst.inMemoryCache) {
//     oThis.cacheObject = InMemoryCacheProvider.getInstance(oThis.consistentBehavior);
//   } else if (oThis.cacheType === cacheManagementConst.sharedMemcached) {
//     oThis.cacheObject = SharedMemcachedProvider.getInstance(oThis.consistentBehavior);
//   } else {
//     throw `shared_cache_multi_management: Invalid cache type: ${oThis.cacheType}`;
//   }
//
//   // Set cacheImplementer to perform caching operations
//   oThis.cacheImplementer = oThis.cacheObject.cacheInstance;
//
//   // call sub class method to set cache keys using params provided
//   oThis.setCacheKeys();
// };

class BaseSharedCacheMultiManagementKlass {
  /**
   * Constructor for cache multi-management base
   *
   * @param {Object} params: cache key generation & expiry related params
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    if (!params) {
      params = {};
    }

    oThis.consistentRead = params.consistentRead;

    oThis.cacheKeys = {};

    oThis.invertedCacheKeys = {};

    oThis.cacheExpiry = null;

    oThis.cacheImplementer = null;
  }

  /**
   * Fetch data from cache, in case of cache miss calls sub class method to fetch data from source
   *
   * @returns {Promise<Result>}: On success, data.value has value. On failure, error details returned.
   */
  async fetch() {
    const oThis = this,
      batchSize = 50;

    let data = await oThis._fetchFromCache(),
      fetchDataRsp = null;

    // if there are any cache misses then fetch that data from source.
    while (data['cacheMiss'].length > 0) {
      let cacheMissData = data['cacheMiss'].splice(0, batchSize);
      fetchDataRsp = await oThis.fetchDataFromSource(cacheMissData);

      // DO NOT WAIT for cache being set
      for (let i = 0; i < cacheMissData.length; i++) {
        let cacheMissFor = cacheMissData[i];
        let dataToSet =
          fetchDataRsp.data[cacheMissFor] || fetchDataRsp.data[cacheMissFor.toString().toLowerCase()] || {};
        data['cachedData'][cacheMissFor] = dataToSet;
        oThis._setCache(cacheMissFor, dataToSet);
      }
    }

    return Promise.resolve(responseHelper.successWithData(data['cachedData']));
  }

  /**
   * Delete the cache entry
   *
   * @returns {Promise<>}
   */
  async clear() {
    const oThis = this;

    for (let i = 0; i < Object.keys(oThis.cacheKeys).length; i++) {
      let cacheKey = Object.keys(oThis.cacheKeys)[i];
      oThis.cacheImplementer.del(cacheKey);
    }
  }

  // methods which sub class would have to implement

  /**
   * set cache keys in oThis.cacheKeys and return it
   *
   * @return {String}
   */
  setCacheKeys() {
    throw 'sub class to implement';
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   *
   * @return {Number}
   */
  setCacheExpiry() {
    throw 'sub class to implement';
  }

  /**
   * Set cache implementer in oThis.cacheExpiry and return it
   *
   * @returns {Number}
   */
  setCacheImplementer() {
    const oThis = this;

    if (oThis.cacheType === cacheManagementConst.inMemory) {
      oThis.cacheObject = InMemoryCacheProvider.getInstance(oThis.consistentBehavior);
    } else if (oThis.cacheType === cacheManagementConst.sharedMemcached) {
      oThis.cacheObject = SharedMemcachedProvider.getInstance(oThis.consistentBehavior);
    } else {
      throw `shared_cacheManagement: Invalid cache type: ${oThis.cacheType}`;
    }

    // Set cacheImplementer to perform caching operations
    oThis.cacheImplementer = oThis.cacheObject.cacheInstance;
  }

  /**
   * fetch data from source
   * return should be of klass Result
   * data attr of return is returned and set in cache
   *
   * @return {Result}
   */
  async fetchDataFromSource(data) {
    throw 'sub class to implement';
  }

  // private methods from here

  /**
   * Fetch from cache
   *
   * @returns {Object}
   */
  async _fetchFromCache() {
    const oThis = this;
    let cacheFetchResponse = null,
      cache_keys = Object.keys(oThis.cacheKeys),
      cache_miss = [],
      cachedResponse = {},
      process_cache_keys = [],
      batchSize = 500;

    while (cache_keys.length > 0) {
      process_cache_keys = cache_keys.splice(0, batchSize);
      cacheFetchResponse = await oThis.cacheImplementer.multiGet(process_cache_keys);

      if (cacheFetchResponse.isSuccess()) {
        let cachedData = cacheFetchResponse.data.response;
        for (let i = 0; i < process_cache_keys.length; i++) {
          let cacheKey = process_cache_keys[i];
          if (cachedData[cacheKey]) {
            cachedResponse[oThis.cacheKeys[cacheKey]] = JSON.parse(cachedData[cacheKey]);
          } else {
            cache_miss.push(oThis.cacheKeys[cacheKey]);
          }
        }
      } else {
        logger.error('==>Error while getting from cache: ', cacheFetchResponse.getDebugData());
        for (let i = 0; i < process_cache_keys.length; i++) {
          let cacheKey = process_cache_keys[i];
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
   * @returns {Result}
   */
  _setCache(key, dataToSet) {
    const oThis = this;

    let setCacheFunction = function(k, v) {
      let cacheKey = oThis.invertedCacheKeys[k.toString()];
      return oThis.cacheImplementer.set(cacheKey, JSON.stringify(v), oThis.cacheExpiry);
    };

    setCacheFunction(key, dataToSet).then(function(cacheSetResponse) {
      if (cacheSetResponse.isFailure()) {
        //TODO:- temp change (remove this and use notify of platform)
        logger.error('cmm_b_2', 'Something Went Wrong', cacheSetResponse.getDebugData());
      }
    });
  }

  /**
   * cache key prefix
   *
   * @return {String}
   */
  _cacheKeyPrefix() {
    return 'saas_' + coreConstants.environmentShort + '_' + coreConstants.subEnvironmentShort + '_';
  }
}

module.exports = BaseSharedCacheMultiManagementKlass;
