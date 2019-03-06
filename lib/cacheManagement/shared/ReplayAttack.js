'use strict';

/*
 * This cache checks if the signature is already used in the last 1 minute
 */

const rootPrefix = '../../..',
  SharedMemcachedProvider = require(rootPrefix + '/lib/providers/sharedMemcached'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

const errorConfig = basicHelper.fetchErrorConfig(apiVersions.v2);

class ReplayAttackCache {
  /**
   * @constructor
   *
   * @param params
   * @param params.signature {String}
   */
  constructor(params) {
    const oThis = this;

    oThis.cacheType = cacheManagementConst.sharedMemcached;
    oThis.signature = params.signature;

    // Call sub class method to set cache level
    oThis._setCacheLevel();

    // Call sub class method to set cache key using params provided
    oThis._setCacheKey();

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
    oThis.cacheLevel = cacheManagementConst.saasSubEnvLevel;
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

  /**
   * Set cache key
   *
   * @return {String}
   */
  _setCacheKey() {
    const oThis = this;

    oThis.cacheKey = oThis._sharedCacheKeyPrefix() + 'r_a_' + oThis.signature;

    return oThis.cacheKey;
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   *
   * @return {Number}
   */
  _setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 60; // 1 minute;

    return oThis.cacheExpiry;
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
   * Set data in cache.
   *
   * @param {Object} dataToSet: data to set in cache
   * @returns {Result}
   */
  _setCache(dataToSet) {
    const oThis = this;

    let setCacheFunction = function() {
      return oThis.cacheImplementer.set(oThis.cacheKey, dataToSet, oThis.cacheExpiry);
    };

    setCacheFunction().then(function(cacheSetResponse) {
      if (cacheSetResponse.isFailure()) {
        logger.error('l_cm_s_ra_1', 'Something Went Wrong', cacheSetResponse);
      }
    });
  }

  /**
   * Fetch from cache
   *
   * @returns {Object}
   */
  async _fetchFromCache() {
    const oThis = this;

    let cacheData;

    let cacheFetchResponse = await oThis.cacheImplementer.get(oThis.cacheKey);

    if (cacheFetchResponse.isSuccess()) {
      cacheData = cacheFetchResponse.data.response;
    }

    return cacheData;
  }

  /**
   * Fetch from cache
   *
   * @return {Promise<*|result>}
   */
  async fetch() {
    const oThis = this;

    logger.debug('CACHE-FETCH## cache key: ', oThis.cacheKey);

    let data = await oThis._fetchFromCache();

    // if cache miss call sub class method to fetch data from source and set cache
    if (data) {
      return responseHelper.error({
        internal_error_identifier: 'l_cm_s_ra_2',
        api_error_identifier: 'invalid_signature',
        debug_options: {
          signature: oThis.signature
        },
        error_config: errorConfig
      });
    }

    // DO NOT WAIT for cache being set
    oThis._setCache(1);
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
}

module.exports = ReplayAttackCache;
