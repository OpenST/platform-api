const rootPrefix = '../../..',
  BaseCacheManagement = require(rootPrefix + '/lib/cacheManagement/kitSaas/Base'),
  TokenRedemptionProductModel = require(rootPrefix + '/app/models/mysql/TokenRedemptionProduct'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

class TokenRedemptionProductIdsByTokenIdCache extends BaseCacheManagement {
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
   *
   * Set cache level
   *
   * @private
   */
  _setCacheLevel() {
    const oThis = this;
    oThis.cacheLevel = cacheManagementConst.kitSaasSubEnvLevel;
  }

  /**
   * set cache keys
   */
  _setCacheKeySuffix() {
    const oThis = this;
    oThis.cacheKeySuffix = 'c_trdp_tid_' + oThis.tokenId;
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   */
  _setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 1 * 24 * 60 * 60; // 1 day;
  }

  /**
   * Fetch data from source.
   *
   * @returns {Promise<*|result>}
   */
  async _fetchDataFromSource() {
    const oThis = this;

    return new TokenRedemptionProductModel().fetchProductIdsByTokenId(oThis.tokenId);
  }
}

module.exports = TokenRedemptionProductIdsByTokenIdCache;
