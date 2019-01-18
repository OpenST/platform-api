'use strict';

const rootPrefix = '../..',
  baseCache = require(rootPrefix + '/lib/sharedCacheManagement/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

class EstimateOriginChainGasPriceCacheKlass extends baseCache {
  /**
   * @constructor
   * @augments baseCache
   */
  constructor(params) {
    super(params);
    const oThis = this;

    oThis.cacheType = cacheManagementConst.sharedMemcached;
    oThis.consistentBehavior = '1';
    oThis.useObject = false;

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
   * @returns {string}
   */
  setCacheKey() {
    const oThis = this;

    oThis.cacheKey = oThis._sharedCacheKeyPrefix() + 'c_evc_gp';

    return oThis.cacheKey;
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   *
   * @return {Number}
   */
  setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 600; // 10 minutes

    return oThis.cacheExpiry;
  }

  /**
   * fetch data from source
   *
   * @return {Result}
   */
  async fetchDataFromSource() {
    let gasPriceToBeSubmittedHex = coreConstants.DEFAULT_VALUE_GAS_PRICE; //DEFAULT_VALUE_GAS_PRICE is in hex

    return Promise.resolve(responseHelper.successWithData(gasPriceToBeSubmittedHex));
  }
}

module.exports = EstimateOriginChainGasPriceCacheKlass;
