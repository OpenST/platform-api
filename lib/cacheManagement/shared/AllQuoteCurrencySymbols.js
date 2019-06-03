'use strict';
/**
 * This cache is to store all quote currency symbols.
 *
 * @module lib/cacheManagement/shared/AllQuoteCurrencySymbols
 */

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  QuoteCurrencyModel = require(rootPrefix + '/app/models/mysql/QuoteCurrency'),
  quoteCurrencyConstants = require(rootPrefix + '/lib/globalConstant/quoteCurrency'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  CacheManagementSharedBase = require(rootPrefix + '/lib/cacheManagement/shared/Base');

class AllQuoteCurrencySymbols extends CacheManagementSharedBase {
  /**
   * Constructor for all quote currencies symbol
   *
   * @param {Object} params - cache key generation & expiry related params
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.cacheType = cacheManagementConst.sharedMemcached;
    oThis.consistentBehavior = '1';

    // Call sub class method to set cache level
    oThis._setCacheLevel();

    // Call sub class method to set cache key using params provided
    oThis.setCacheKey();

    // Call sub class method to set cache expiry using params provided
    oThis.setCacheExpiry();

    // Call sub class method to set cache implementer using params provided
    oThis.setCacheImplementer();
  }

  /**
   *
   * Set cache level
   *
   * @private
   */
  _setCacheLevel() {
    const oThis = this;
    oThis.cacheLevel = cacheManagementConst.saasSubEnvLevel;
  }

  /**
   * set cache key
   *
   * @return {String}
   */
  setCacheKey() {
    const oThis = this;

    oThis.cacheKey = oThis._sharedCacheKeyPrefix() + 'c_q_c_s';

    return oThis.cacheKey;
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   *
   * @return {Number}
   */
  setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 10 * 24 * 60 * 60; // 10 days ;

    return oThis.cacheExpiry;
  }

  /**
   * fetch data from source
   *
   * @return {Result}
   */
  async fetchDataFromSource() {
    const oThis = this;

    let quoteCurrencyDetails = await new QuoteCurrencyModel()
        .select('symbol')
        .where({ status: quoteCurrencyConstants.invertedStatuses[quoteCurrencyConstants.activeStatus] })
        .fire(),
      quoteCurrencySymbols = [];

    for (let i = 0; i < quoteCurrencyDetails.length; i++) {
      quoteCurrencySymbols.push(quoteCurrencyDetails[i].symbol);
    }

    return responseHelper.successWithData(quoteCurrencySymbols);
  }
}

module.exports = AllQuoteCurrencySymbols;
