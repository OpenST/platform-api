/**
 * Cache management base
 *
 * @module lib/cacheManagement/chain/Base
 */

const rootPrefix = '../../..',
  emailNotifier = require(rootPrefix + '/lib/notifier'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/providers/clientSpecificCacheFactory');

/**
 * Class for chain cache management base
 *
 * @class ChainCacheManagementBase
 */
class ChainCacheManagementBase {
  /**
   * Constructor for chain cache management base
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

    oThis.cacheType = cacheManagementConst.memcached;
    oThis.consistentBehavior = '1';
    oThis.useObject = true;

    oThis.cacheKey = null;
    oThis.cacheKeyPrefix = null;
    oThis.cacheExpiry = null;
    oThis.cacheImplementer = null;
    oThis.cacheLevel = null;
  }

  /**
   * Fetch data from cache, in case of cache miss calls sub class method to fetch data from source
   *
   * @return {Promise<*>}
   */
  async fetch() {
    const oThis = this;

    if (oThis.cacheKey) {
      logger.debug('CACHE-FETCH## lib/cacheManagement/chain/Base cache key: ', oThis.cacheKey);
    } else {
      console.trace('Empty cache key in lib/cacheManagement/chain/Base');
    }

    let data = await oThis._fetchFromCache();

    // If cache miss call sub class method to fetch data from source and set cache
    if (!data) {
      const fetchDataRsp = await oThis.fetchDataFromSource();

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
  clear() {
    const oThis = this;

    return oThis.cacheImplementer.del(oThis.cacheKey);
  }

  /**
   * Set cache implementer
   *
   * @returns {Number}
   */
  _setCacheImplementer() {
    const oThis = this;

    if (oThis.cacheType === cacheManagementConst.memcached) {
      oThis.cacheObject = oThis
        .ic()
        .getInstanceFor(coreConstants.icNameSpace, 'ClientSpecificCacheProvider')
        .getInstance(oThis.cacheType, oThis.consistentBehavior);
    } else {
      throw new Error(`shared_cacheManagement: Invalid cache type: ${oThis.cacheType}`);
    }

    // Set cacheImplementer to perform caching operations
    oThis.cacheImplementer = oThis.cacheObject.cacheInstance;
  }

  /**
   * Fetch data from source.
   * NOTES: 1. return should be of klass Result
   *        2. data attr of return is returned and set in cache
   *
   * @returns {Result}
   */
  async fetchDataFromSource() {
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

    const setCacheFunction = function() {
      if (oThis.useObject) {
        return oThis.cacheImplementer.setObject(oThis.cacheKey, dataToSet, oThis.cacheExpiry);
      }

      return oThis.cacheImplementer.set(oThis.cacheKey, dataToSet, oThis.cacheExpiry);
    };

    setCacheFunction().then(function(cacheSetResponse) {
      if (cacheSetResponse.isFailure()) {
        emailNotifier.perform('l_cm_c_b_1', 'Error in setting cache.', cacheSetResponse, {});
        logger.error('cm_b_2', 'Something Went Wrong', cacheSetResponse);
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
  _setCacheKey() {
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
}

module.exports = ChainCacheManagementBase;
