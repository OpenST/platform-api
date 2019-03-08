/**
 * Kit-saas Cache management base
 *
 * @module lib/cacheManagement/kitSaas/Base
 */

const rootPrefix = '../../..',
  SharedMemcachedProvider = require(rootPrefix + '/lib/providers/sharedMemcached'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  flushFromAllMemcacheInstances = require(rootPrefix + '/lib/flushFromAllMemcacheInstances');

/**
 * Class for Kit-saas cache management base
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
    oThis.cacheLevel = null;
    oThis.cacheExpiry = null;
    oThis.cacheImplementer = null;
    oThis.saasCacheKey = null;
  }

  /**
   * Fetch data from cache, in case of cache miss calls sub class method to fetch data from source
   *
   * @returns {Promise<Result>}: On success, data.value has value. On failure, error details returned.
   */
  async fetch() {
    const oThis = this;

    logger.debug('CACHE-FETCH## cache key: ', oThis.saasCacheKey);

    let data = await oThis._fetchFromCache();

    // If cache miss call sub class method to fetch data from source and set cache
    if (!data) {
      const fetchDataRsp = await oThis._fetchDataFromSource();

      // If fetch from source failed do not set cache and return error response
      if (fetchDataRsp.isFailure()) {
        return fetchDataRsp;
      }

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

    await oThis.cacheImplementer.del(oThis._saasCacheKey);

    return flushFromAllMemcacheInstances.clearCache(oThis._kitCacheKey);
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
   * Set cache level in oThis.cacheLevel
   */
  _setCacheLevel() {
    throw new Error('Sub-class to implement');
  }

  /**
   * Set cache key in oThis.cacheKeySuffix
   */
  _setCacheKeySuffix() {
    throw new Error('Sub-class to implement');
  }

  /**
   * Set cache expiry in oThis.cacheExpiry
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
  async _fetchDataFromSource() {
    throw new Error('Sub-class to implement');
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
      cacheFetchResponse = await oThis.cacheImplementer.getObject(oThis._saasCacheKey);
    } else {
      cacheFetchResponse = await oThis.cacheImplementer.get(oThis._saasCacheKey);
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
   *
   * @returns {Result}
   */
  _setCache(dataToSet) {
    const oThis = this;

    const setCacheFunction = function() {
      if (oThis.useObject) {
        return oThis.cacheImplementer.setObject(oThis._saasCacheKey, dataToSet, oThis.cacheExpiry);
      }

      return oThis.cacheImplementer.set(oThis._saasCacheKey, dataToSet, oThis.cacheExpiry);
    };

    setCacheFunction().then((cacheSetResponse) => {
      if (cacheSetResponse.isFailure()) {
        basicHelper.notify('l_cm_ks_b_1', 'Error in setting cache.', {}, cacheSetResponse.getDebugData());
        logger.error('l_cm_ks_b_2', 'Error in setting cache.', cacheSetResponse.getDebugData());
      }
    });
  }

  /**
   * Key used by Saas in its caches.
   *
   * @return {String}
   */
  get _saasCacheKey() {
    const oThis = this;
    if (oThis.saasCacheKey) {
      return oThis.saasCacheKey;
    }
    oThis.saasCacheKey = `${cacheManagementConst.getSaasPrefixForLevel(oThis.cacheLevel)}${oThis.cacheKeySuffix}`;

    return oThis.saasCacheKey;
  }

  /**
   * Key used by KIT in its caches
   *
   * @return {String}
   */
  get _kitCacheKey() {
    const oThis = this;

    return `${cacheManagementConst.getKitPrefixForLevel(oThis.cacheLevel)}${oThis.cacheKeySuffix}`;
  }
}

module.exports = BaseSharedCacheManagement;
