'use strict';

const rootPrefix = '../..',
  BaseSharedCacheManagement = require(rootPrefix + '/lib/sharedCacheManagement/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  storageConstants = require(rootPrefix + '/lib/globalConstant/storage');

class SystemServiceStatusesCacheKlass extends BaseSharedCacheManagement {
  /**
   * Constructor for all token transfers by transaction hash cache
   *
   * @param {Object} params - cache key generation & expiry related params
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.cacheType = cacheManagementConst.shared_memcached;
    oThis.consistentBehavior = '1';

    // Call sub class method to set cache key using params provided
    oThis.setCacheKey();

    // Call sub class method to set cache expiry using params provided
    oThis.setCacheExpiry();

    // Call sub class method to set cache implementer using params provided
    oThis.setCacheImplementer();
  }

  /**
   * set cache key
   *
   * @return {String}
   */
  setCacheKey() {
    const oThis = this;

    oThis.cacheKey = oThis._sharedCacheKeyPrefix() + 'c_sys_ss';

    return oThis.cacheKey;
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   *
   * @return {Number}
   */
  setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 24 * 60 * 60; // 24 hours ;

    return oThis.cacheExpiry;
  }

  /**
   * fetch data from source
   *
   * @return {Result}
   */
  async fetchDataFromSource() {
    const oThis = this;

    const formattedRsp = { saas_api_available: 1 };

    return Promise.resolve(responseHelper.successWithData(formattedRsp));
  }
}

module.exports = SystemServiceStatusesCacheKlass;
