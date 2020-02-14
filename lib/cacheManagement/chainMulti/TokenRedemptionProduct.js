/**
 * Module to get redemption product details from cache.
 *
 * @module lib/cacheManagement/chainMulti/TokenRedemptionProduct
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  CacheManagementChainMultiBase = require(rootPrefix + '/lib/cacheManagement/chainMulti/Base'),
  TokenRedemptionProductModel = require(rootPrefix + '/app/models/mysql/TokenRedemptionProduct'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

/**
 * Class to get redemption product details from cache.
 *
 * @class TokenRedemptionProductCache
 */
class TokenRedemptionProductCache extends CacheManagementChainMultiBase {
  /**
   * Constructor to get redemption product details from cache.
   *
   * @param {object} params
   *
   * @augments CacheManagementSharedMultiBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.ids = params.ids;

    // Call sub class method to set cache level
    oThis._setCacheLevel();

    // Call sub class method to set cache key using params provided
    oThis._setCacheKeys();

    oThis._setInvertedCacheKeys();

    // Call sub class method to set cache expiry using params provided
    oThis._setCacheExpiry();

    // Call sub class method to set cache implementer using params provided
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

    oThis.cacheLevel = cacheManagementConst.saasSubEnvLevel;
  }

  /**
   * Set cache key.
   *
   * @sets oThis.cacheKeys
   *
   * @return {String}
   */
  _setCacheKeys() {
    const oThis = this;

    for (let i = 0; i < oThis.ids.length; i++) {
      oThis.cacheKeys[oThis._cacheKeyPrefix() + 'c_trdp_id_' + oThis.ids[i]] = oThis.ids[i];
    }
  }

  /**
   * Set cache expiry.
   *
   * @sets oThis.cacheExpiry
   */
  _setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 1 * 24 * 60 * 60; // 1 days;
  }

  /**
   * Fetch data from source.
   *
   * @return {Result}
   */
  async fetchDataFromSource(cacheMissIds) {
    return new TokenRedemptionProductModel().fetchTokenRedemptionProductsByIds(cacheMissIds);
  }

  /**
   * Validate data to set.
   *
   * @param dataToSet
   * @returns {*}
   */
  validateDataToSet(dataToSet) {
    return dataToSet;
  }
}

InstanceComposer.registerAsShadowableClass(
  TokenRedemptionProductCache,
  coreConstants.icNameSpace,
  'TokenRedemptionProductCache'
);

module.exports = {};
