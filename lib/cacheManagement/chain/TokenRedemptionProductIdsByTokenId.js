/**
 * Cache for Token Redemption Product Ids By Token Id.
 *
 * @module lib/cacheManagement/chain/TokenRedemptionProductIdsByTokenId
 */
const OSTBase = require('@ostdotcom/base');

const rootPrefix = '../../..',
  ChainCacheManagementBase = require(rootPrefix + '/lib/cacheManagement/chain/Base'),
  TokenRedemptionProductModel = require(rootPrefix + '/app/models/mysql/TokenRedemptionProduct'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

const InstanceComposer = OSTBase.InstanceComposer;

class TokenRedemptionProductIdsByTokenIdCache extends ChainCacheManagementBase {
  /**
   * Constructor for Token Redemption Product Ids By Token Id Cache.
   *
   * @param {String} params.tokenId
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
    oThis._setCacheKey();

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
    oThis.cacheLevel = cacheManagementConst.saasSubEnvLevel;
  }

  /**
   * Set cache key
   *
   * @return {String}
   */
  _setCacheKey() {
    const oThis = this;

    oThis.cacheKey = oThis._cacheKeyPrefix() + 'c_trdp_tid_' + oThis.tokenId.toString();

    return oThis.cacheKey;
  }

  /**
   * Set cache expiry in oThis.cacheExpiry and return it
   *
   * @return {Number}
   */
  _setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 1 * 24 * 60 * 60; // 1 days;

    return oThis.cacheExpiry;
  }

  /**
   * Fetch data from source
   *
   * @return {Result}
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
