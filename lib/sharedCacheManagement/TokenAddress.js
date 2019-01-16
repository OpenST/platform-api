'use strict';

/*
 * Cache for fetching token addresses. Extends base cache.
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  BaseSharedCacheManagement = require(rootPrefix + '/lib/sharedCacheManagement/Base'),
  TokenAddress = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

class TokenAddressCache extends BaseSharedCacheManagement {
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
    oThis.cacheKey = oThis._sharedCacheKeyPrefix() + 'ta_' + oThis.tokenId;
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

    return new TokenAddress().fetchAllAddresses({
      tokenId: oThis.tokenId
    });
  }
}

InstanceComposer.registerAsShadowableClass(TokenAddressCache, coreConstants.icNameSpace, 'TokenAddressCache');

module.exports = TokenAddressCache;
