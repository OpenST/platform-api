'use strict';

/*
 * Cache for fetching token addresses. Extends base cache.
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  BaseCacheMultiManagement = require(rootPrefix + '/lib/cacheMultiManagement/Base'),
  TokenAddress = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

class TokenAddressCache extends BaseCacheMultiManagement {
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
    oThis.stringKinds = params.kinds;

    oThis.cacheType = cacheManagementConst.memcached;
    oThis.consistentBehavior = '1';

    // Call sub class method to set cache key using params provided
    oThis._setCacheKeys();

    oThis._setInvertedCacheKeys();

    // Call sub class method to set cache expiry using params provided
    oThis._setCacheExpiry();

    // Call sub class method to set cache implementer using params provided
    oThis._setCacheImplementer();
  }

  /**
   * set cache keys
   */
  _setCacheKeys() {
    const oThis = this;

    for (let i = 0; i < oThis.stringKinds.length; i++) {
      oThis.cacheKeys[oThis._cacheKeyPrefix() + 'cmm_ta_' + oThis.tokenId + '_' + oThis.stringKinds[i]] =
        oThis.stringKinds[i];
    }
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   */
  _setCacheExpiry() {
    const oThis = this;
    oThis.cacheExpiry = 3 * 24 * 60 * 60; // 72 hours ;
  }

  /**
   * fetch data from source
   *
   * @return {Result}
   */
  async fetchDataFromSource(cacheMissKinds) {
    const oThis = this;

    return new TokenAddress().fetchAddresses({
      tokenId: oThis.tokenId,
      kinds: cacheMissKinds
    });
  }
}

InstanceComposer.registerAsShadowableClass(TokenAddressCache, coreConstants.icNameSpace, 'TokenAddressCache');

module.exports = TokenAddressCache;
