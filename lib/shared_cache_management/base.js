'use strict';

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/core_constants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  cacheManagementConst = require(rootPrefix + '/lib/global_constant/cache_management'),
  SharedMemcachedProvider = require(rootPrefix + '/lib/providers/shared_memcached'),
  InMemoryCacheProvider = require(rootPrefix + '/lib/providers/in_memory_cache'),
  logger = require(rootPrefix + '/lib/logger/custom_console_logger');

/**
 * constructor
 *
 * @param {Object} params - cache key generation & expiry related params
 *
 * @constructor
 */
const BaseSharedCacheManagementKlass = function(params) {
  const oThis = this;

  if (!params) {
    params = {};
  }

  oThis.params = params;

  oThis.useObject = params['useObject'] === true;

  oThis.cacheKey = null;

  oThis.cacheExpiry = null;

  oThis.cacheObject = null;

  if (oThis.cacheType === cacheManagementConst.in_memory) {
    oThis.cacheObject = InMemoryCacheProvider.getInstance(oThis.consistentBehavior);
  } else if (oThis.cacheType === cacheManagementConst.shared_memcached) {
    oThis.cacheObject = SharedMemcachedProvider.getInstance(oThis.consistentBehavior);
  } else {
    throw `shared_cache_management: Invalid cache type: ${oThis.cacheType}`;
  }

  // Set cacheImplementer to perform caching operations
  oThis.cacheImplementer = oThis.cacheObject.cacheInstance;

  // call sub class method to set cache key using params provided
  oThis.setCacheKey();

  // call sub class method to set cache expiry using params provided
  oThis.setCacheExpiry();
};

BaseSharedCacheManagementKlass.prototype = {
  /**
   * Fetch data from cache, in case of cache miss calls sub class method to fetch data from source
   *
   * @return {Promise<Result>} - On success, data.value has value. On failure, error details returned.
   */
  fetch: async function() {
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
  },

  /**
   * clear cache
   *
   * @return {Promise<Result>}
   */
  clear: function() {
    const oThis = this;

    return oThis.cacheImplementer.del(oThis.cacheKey);
  },

  // methods which sub class would have to implement

  /**
   * set cache key in oThis.cacheKey and return it
   *
   * @return {String}
   */
  setCacheKey: function() {
    throw 'sub class to implement';
  },

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   *
   * @return {Number}
   */
  setCacheExpiry: function() {
    throw 'sub class to implement';
  },

  /**
   * fetch data from source
   * return should be of klass Result
   * data attr of return is returned and set in cache
   *
   * @return {Result}
   */
  fetchDataFromSource: async function() {
    throw 'sub class to implement';
  },

  // private methods from here

  /**
   * fetch from cache
   *
   * @return {Object}
   */
  _fetchFromCache: async function() {
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
  },

  /**
   * set data in cache.
   *
   * @param {Object} dataToSet - data to set in cache
   *
   * @return {Result}
   */
  _setCache: function(dataToSet) {
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
        logger.notify('cm_b_2', 'Something Went Wrong', cacheSetResponse);
      }
    });
  },

  /**
   * cache key prefix
   *
   * @return {String}
   */
  _cacheKeyPrefix: function() {
    return 'saas_' + coreConstants.ENVIRONMENT_SHORT + '_' + coreConstants.SUB_ENVIRONMENT_SHORT + '_';
  },

  /**
   * Shared cache key prefix
   * This cache is shared between company api and saas
   * Cache keys with these prefixes can be flushed via company api or saas.
   *
   * @return {String}
   */
  _sharedCacheKeyPrefix: function() {
    return (
      coreConstants.SHARED_MEMCACHE_KEY_PREFIX +
      coreConstants.ENVIRONMENT_SHORT +
      '_' +
      coreConstants.SUB_ENVIRONMENT_SHORT +
      '_'
    );
  }
};

module.exports = BaseSharedCacheManagementKlass;
