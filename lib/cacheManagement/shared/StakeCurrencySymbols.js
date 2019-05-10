'use strict';
/**
 * This cache is to store all stake currency symbols.
 *
 * @module app/services/baseTokens/Get
 */

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  StakeCurrencyModel = require(rootPrefix + '/app/models/mysql/StakeCurrency'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  CacheManagementSharedBase = require(rootPrefix + '/lib/cacheManagement/shared/Base');

class StakeCurrencySymbols extends CacheManagementSharedBase {
  /**
   * Constructor for all stake currencies symbol
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

    oThis.cacheKey = oThis._sharedCacheKeyPrefix() + 'c_s_c_s';

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

    let stakeCurrenciesDetails = await new StakeCurrencyModel().select('symbol').fire(),
      stakeCurrencySymbols = [];

    for (let i = 0; i < stakeCurrenciesDetails.length; i++) {
      stakeCurrencySymbols.push(stakeCurrenciesDetails[i].symbol);
    }

    return responseHelper.successWithData(stakeCurrencySymbols);
  }
}

module.exports = StakeCurrencySymbols;
