'use strict';
/**
 * Cache management base
 *
 * @module lib/sharedCacheManagement/Base
 */
const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  InMemoryCacheProvider = require(rootPrefix + '/lib/providers/inMemoryCache'),
  SharedMemcachedProvider = require(rootPrefix + '/lib/providers/sharedMemcached'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

/**
 * Class for cache management base
 *
 * @class
 */
class BaseSharedCacheManagement {
  /**
   * Constructor for cache management base
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
    oThis.useObject = null;
    oThis.cacheKey = null;
    oThis.cacheLevel = null;
    oThis.cacheExpiry = null;
    oThis.cacheImplementer = null;
    oThis.cacheKeyPrefix = null;
  }

  /**
   * Fetch data from cache, in case of cache miss calls sub class method to fetch data from source
   *
   * @returns {Promise<Result>}: On success, data.value has value. On failure, error details returned.
   */
  async fetch() {
    const oThis = this;

    let data = await oThis._fetchFromCache();

    // if cache miss call sub class method to fetch data from source and set cache
    if (!data) {
      let fetchDataRsp = await oThis.fetchDataFromSource();

      // if fetch from source failed do not set cache and return error response
      if (fetchDataRsp.isFailure()) return fetchDataRsp;

      data = fetchDataRsp.data;
      // DO NOT WAIT for cache being set
      oThis._setCache(data);
    }

    return responseHelper.successWithData(data);
  }

  /**
   * Delete the cache entry
   *
   * @returns {Promise<*>}
   */
  async clear() {
    const oThis = this;

    return oThis.cacheImplementer.del(oThis.cacheKey);
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

  // Methods which the sub-class would have to implement

  /**
   * Set cache key in oThis.cacheKey and return it
   *
   * @returns {String}
   */
  setCacheKey() {
    throw 'sub class to implement';
  }

  /**
   * Set cache expiry in oThis.cacheExpiry and return it
   *
   * @returns {Number}
   */
  setCacheExpiry() {
    throw 'sub class to implement';
  }

  /**
   * Fetch data from source.
   * NOTES: 1. return should be of klass Result
   *        2. data attr of return is returned and set in cache
   *
   * @returns {Result}
   */
  async fetchDataFromSource() {
    throw 'sub class to implement';
  }

  /**
   * Set cache level in oThis.cacheLevel
   */
  _setCacheLevel() {
    throw 'sub class to implement';
  }

  // Private methods start from here

  /**
   * Fetch from cache
   *
   * @returns {Object}
   */
  async _fetchFromCache() {
    const oThis = this;
    let cacheFetchResponse = null,
      cacheData = null;

    if (oThis.useObject) {
      cacheFetchResponse = await oThis.cacheImplementer.getObject(oThis.cacheKey);
    } else {
      cacheFetchResponse = await oThis.cacheImplementer.get(oThis.cacheKey);
    }

    if (cacheFetchResponse.isSuccess()) {
      cacheData = cacheFetchResponse.data.response;
    }

    return cacheData;
  }

  /**
   * Set data in cache.
   *
   * @param {Object} dataToSet: data to set in cache
   * @returns {Result}
   */
  _setCache(dataToSet) {
    const oThis = this;

    let setCacheFunction = function() {
      if (oThis.useObject) {
        return oThis.cacheImplementer.setObject(oThis.cacheKey, dataToSet, oThis.cacheExpiry);
      } else {
        return oThis.cacheImplementer.set(oThis.cacheKey, dataToSet, oThis.cacheExpiry);
      }
    };

    setCacheFunction().then(function(cacheSetResponse) {
      if (cacheSetResponse.isFailure()) {
        //TODO:- temp change (remove this and use notify)
        logger.error('cm_b_2', 'Something Went Wrong', cacheSetResponse);
      }
    });
  }

  /**
   * cache key prefix
   *
   * @return {String}
   */
  _sharedCacheKeyPrefix() {
    const oThis = this;
    if (oThis.cacheKeyPrefix) {
      return oThis.cacheKeyPrefix;
    }
    oThis.cacheKeyPrefix = cacheManagementConst.getSaasPrefixForLevel(oThis.cacheLevel);
    return oThis.cacheKeyPrefix;
  }
}

module.exports = BaseSharedCacheManagement;
