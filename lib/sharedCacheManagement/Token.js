'use strict';

/*
 * Cache for staker whitelisted addresses. Extends base cache.
 */

const rootPrefix = '../..',
  BaseSharedCacheManagement = require(rootPrefix + '/lib/sharedCacheManagement/Base'),
  Token = require(rootPrefix + '/app/models/mysql/Token'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

class TokenCache extends BaseSharedCacheManagement {
  /**
   * Constructor
   *
   * @param {Object} params - cache key generation & expiry related params
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenId = params.tokenId;

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
    oThis.cacheKey = `${oThis._sharedCacheKeyPrefix()}c_tkn_${oThis.tokenId}`;
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
    return new Token().getDetailsById(oThis.tokenId);
  }
}

module.exports = TokenCache;
