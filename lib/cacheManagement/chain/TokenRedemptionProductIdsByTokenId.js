const OSTBase = require('@ostdotcom/base');

const rootPrefix = '../../..',
  ChainCacheManagementBase = require(rootPrefix + '/lib/cacheManagement/chain/Base'),
  TokenRedemptionProductModel = require(rootPrefix + '/app/models/mysql/TokenRedemptionProduct'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  cacheManagementConstants = require(rootPrefix + '/lib/globalConstant/cacheManagement');

const InstanceComposer = OSTBase.InstanceComposer;

/**
 * Class to get redemption product ids for a token for cache.
 *
 * @class TokenRedemptionProductIdsByTokenIdCache
 */
class TokenRedemptionProductIdsByTokenIdCache extends ChainCacheManagementBase {
  /**
   * Constructor to get redemption product ids for a token for cache.
   *
   * @param {string} params.tokenId
   *
   * @augments ChainCacheManagementBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenId = params.tokenId;

    // Call sub class method to set cache level.
    oThis._setCacheLevel();

    // Call sub class method to set cache key using params provided.
    oThis._setCacheKey();

    // Call sub class method to set cache expiry using params provided.
    oThis._setCacheExpiry();

    // Call sub class method to set cache implementer using params provided.
    oThis._setCacheImplementer();
  }

  /**
   * Set cache level.
   *
   * @sets oThis.cacheLevel
   *
   * @private
   */
  _setCacheLevel() {
    const oThis = this;

    oThis.cacheLevel = cacheManagementConstants.saasSubEnvLevel;
  }

  /**
   * Set cache key.
   *
   * @sets oThis.cacheKey
   *
   * @returns {string}
   * @private
   */
  _setCacheKey() {
    const oThis = this;

    oThis.cacheKey = oThis._cacheKeyPrefix() + 'c_trdp_tid_' + oThis.tokenId.toString();

    return oThis.cacheKey;
  }

  /**
   * Set cache expiry.
   *
   * @sets oThis.cacheExpiry
   *
   * @returns {number}
   * @private
   */
  _setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 1 * 24 * 60 * 60; // 1 days;

    return oThis.cacheExpiry;
  }

  /**
   * Fetch data from source.
   *
   * @returns {Promise<*|result>}
   */
  async fetchDataFromSource() {
    const oThis = this;

    return new TokenRedemptionProductModel().fetchProductIdsByTokenId(oThis.tokenId);
  }
}

InstanceComposer.registerAsShadowableClass(
  TokenRedemptionProductIdsByTokenIdCache,
  coreConstants.icNameSpace,
  'TokenRedemptionProductIdsByTokenIdCache'
);

module.exports = {};
