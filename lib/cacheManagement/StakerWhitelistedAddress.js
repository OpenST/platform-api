'use strict';

/*
 * Cache for staker whitelisted addresses. Extends base cache.
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  BaseCacheManagement = require(rootPrefix + '/lib/cacheManagement/Base'),
  StakerWhitelistedAddress = require(rootPrefix + '/app/models/mysql/StakerWhitelistedAddress'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

class StakerWhitelistedAddressCache extends BaseCacheManagement {
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
    oThis.address = params.address;

    oThis.cacheType = cacheManagementConst.memcached;
    oThis.consistentBehavior = '1';

    oThis.useObject = true;

    // Call sub class method to set cache key using params provided
    oThis._setCacheKey();

    // Call sub class method to set cache expiry using params provided
    oThis._setCacheExpiry();

    // Call sub class method to set cache implementer using params provided
    oThis._setCacheImplementer();
  }

  /**
   * set cache keys
   */
  _setCacheKey() {
    const oThis = this;
    oThis.cacheKey = `${oThis._cacheKeyPrefix()}c_swa_${oThis.tokenId}_${oThis.address.toLowerCase()}`;
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   */
  _setCacheExpiry() {
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

    return new StakerWhitelistedAddress().fetchAddress({
      tokenId: oThis.tokenId,
      stakerAddress: oThis.address
    });
  }
}

InstanceComposer.registerAsShadowableClass(
  StakerWhitelistedAddressCache,
  coreConstants.icNameSpace,
  'StakerWhitelistedAddressCache'
);

module.exports = StakerWhitelistedAddressCache;
