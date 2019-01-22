'use strict';
/**
 * Cache for token details.
 *
 * @module lib/sharedCacheManagement/Token
 */

const rootPrefix = '../..',
  Token = require(rootPrefix + '/app/models/mysql/Token'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  BaseSharedCacheManagement = require(rootPrefix + '/lib/sharedCacheManagement/Base');

/**
 * Class for token details cache
 *
 * @class
 */
class TokenCache extends BaseSharedCacheManagement {
  /**
   * Constructor for token details cache
   *
   * @param {Object} params - cache key generation & expiry related params
   *
   * @augments BaseSharedCacheManagement
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.clientId;

    oThis.useObject = true;
    oThis.cacheType = cacheManagementConst.sharedMemcached;
    oThis.consistentBehavior = '1';

    // Call sub class method to set cache key using params provided
    oThis.setCacheKey();

    // Call sub class method to set cache expiry using params provided
    oThis.setCacheExpiry();

    // Call sub class method to set cache implementer using params provided
    oThis.setCacheImplementer();
  }

  /**
   * set cache keys
   */
  setCacheKey() {
    const oThis = this;
    oThis.cacheKey = `${oThis._sharedCacheKeyPrefix()}c_tkn_${oThis.clientId}`;
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   */
  setCacheExpiry() {
    const oThis = this;
    oThis.cacheExpiry = 24 * 60 * 60; // 24 hours ;
  }

  /**
   * fetch data from source
   *
   * @return {Result}
   */
  async fetchDataFromSource() {
    const oThis = this;
    return await new Token().getDetailsByClientId(oThis.clientId);
  }
}

module.exports = TokenCache;
