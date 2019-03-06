/**
 * Cache for staker whitelisted addresses. Extends base cache.
 *
 * @module lib/cacheManagement/kitSaas/StakerWhitelistedAddress
 */

const rootPrefix = '../../..',
  BaseCacheManagement = require(rootPrefix + '/lib/cacheManagement/kitSaas/Base'),
  StakerWhitelistedAddress = require(rootPrefix + '/app/models/mysql/StakerWhitelistedAddress'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

/**
 * Class for staker whitelisted addresses.
 *
 * @class StakerWhitelistedAddressCache
 */
class StakerWhitelistedAddressCache extends BaseCacheManagement {
  /**
   * Constructor for staker whitelisted addresses.
   *
   * @param {Object} params: cache key generation & expiry related params
   * @param {Number/String} params.tokenId
   *
   * @augments BaseCacheManagement
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenId = params.tokenId;

    // Call sub class method to set cache level
    oThis._setCacheLevel();

    // Call sub class method to set cache key using params provided
    oThis._setCacheKeySuffix();

    // Call sub class method to set cache expiry using params provided
    oThis._setCacheExpiry();

    // Call sub class method to set cache implementer using params provided
    oThis._setCacheImplementer();
  }

  /**
   * Set cache level
   *
   * @private
   */
  _setCacheLevel() {
    const oThis = this;

    oThis.cacheLevel = cacheManagementConst.kitSaasSubEnvLevel;
  }

  /**
   * Set cache keys.
   */
  _setCacheKeySuffix() {
    const oThis = this;

    oThis.cacheKeySuffix = `c_swa_${oThis.tokenId}`;
  }

  /**
   * Set cache expiry in oThis.cacheExpiry and return it
   */
  _setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 24 * 60 * 60; // 24 hours ;
  }

  /**
   * Fetch data from source
   *
   * @private
   *
   * @return {Result}
   */
  async _fetchDataFromSource() {
    const oThis = this;

    return new StakerWhitelistedAddress().fetchAddress({
      tokenId: oThis.tokenId
    });
  }
}

module.exports = StakerWhitelistedAddressCache;
