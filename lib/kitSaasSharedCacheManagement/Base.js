'use strict';
/**
 * kit-saas Cache management base
 *
 * @module lib/kitSaasSharedCacheManagement/Base
 */
const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  SharedMemcachedProvider = require(rootPrefix + '/lib/providers/sharedMemcached'),
  flushFromAllMemcacheInstances = require(rootPrefix + '/lib/flushFromAllMemcacheInstances');

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

    oThis.consistentBehavior = '1';
    oThis.useObject = true;

    oThis.cacheKeySuffix = null;
    oThis.cacheExpiry = null;
    oThis.cacheImplementer = null;
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
      let fetchDataRsp = await oThis._fetchDataFromSource();

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
    await oThis.cacheImplementer.del(oThis._saasSharedCacheKey);
    return flushFromAllMemcacheInstances.clearCache(oThis._kitSharedCacheKey);
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

  // Methods which the sub-class would have to implement

  /**
   * Set cache key in oThis.cacheKeySuffix and return it
   */
  _setCacheKeySuffix() {
    throw 'sub class to implement';
  }

  /**
   * Set cache expiry in oThis.cacheExpiry and return it
   *
   * @returns {Number}
   */
  _setCacheExpiry() {
    throw 'sub class to implement';
  }

  /**
   * Fetch data from source.
   * NOTES: 1. return should be of klass Result
   *        2. data attr of return is returned and set in cache
   *
   * @returns {Result}
   */
  async _fetchDataFromSource() {
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
      cacheFetchResponse = await oThis.cacheImplementer.getObject(oThis._saasSharedCacheKey);
    } else {
      cacheFetchResponse = await oThis.cacheImplementer.get(oThis._saasSharedCacheKey);
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
        return oThis.cacheImplementer.setObject(oThis._saasSharedCacheKey, dataToSet, oThis.cacheExpiry);
      } else {
        return oThis.cacheImplementer.set(oThis._saasSharedCacheKey, dataToSet, oThis.cacheExpiry);
      }
    };

    setCacheFunction().then(function(cacheSetResponse) {
      if (cacheSetResponse.isFailure()) {
        //TODO:- temp change (remove this and use notify)
        logger.error('ksscm_b_2', 'Something Went Wrong', cacheSetResponse);
      }
    });
  }

  /**
   * key used by KIT in its caches
   * @return {String}
   */
  get _saasSharedCacheKey() {
    const oThis = this;
    return oThis._saasSharedCacheKeyPrefix + oThis.cacheKeySuffix;
  }

  /**
   * key used by KIT in its caches
   * @return {String}
   */
  get _kitSharedCacheKey() {
    const oThis = this;
    return oThis._kitSharedCacheKeyPrefix + oThis.cacheKeySuffix;
  }

  /**
   * Prefix used by KIT in its caches
   * @return {String}
   */
  get _kitSharedCacheKeyPrefix() {
    const oThis = this;
    return coreConstants.KIT_SHARED_MEMCACHE_KEY_PREFIX + oThis._genericPrefix;
  }

  /**
   * Prefix used by Saas in its caches
   * @return {String}
   */
  get _saasSharedCacheKeyPrefix() {
    const oThis = this;
    return coreConstants.SAAS_SHARED_MEMCACHE_KEY_PREFIX + oThis._genericPrefix;
  }

  /**
   *
   * prefix which is part of kit & saas caches
   *
   * @return {string}
   * @private
   */
  get _genericPrefix() {
    return coreConstants.environmentShort + '_' + coreConstants.subEnvironmentShort + '_';
  }
}

module.exports = BaseSharedCacheManagement;
