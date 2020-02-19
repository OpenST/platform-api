const rootPrefix = '../../..',
  RedemptionProductModel = require(rootPrefix + '/app/models/mysql/RedemptionProduct'),
  CacheManagementSharedMultiBase = require(rootPrefix + '/lib/cacheManagement/sharedMulti/Base'),
  util = require(rootPrefix + '/lib/util'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

/**
 * Class to get redemption product details from cache.
 *
 * @class RedemptionProductCache
 */
class RedemptionProductCache extends CacheManagementSharedMultiBase {
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
    oThis.cacheType = cacheManagementConst.sharedMemcached;
    oThis.consistentBehavior = '0';

    // Call sub class method to set cache level
    oThis._setCacheLevel();

    // Call sub class method to set cache key using params provided
    oThis.setCacheKeys();

    // Call sub class method to set cache expiry using params provided
    oThis.setCacheExpiry();

    // Call sub class method to set cache implementer using params provided
    oThis.setCacheImplementer();
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
   * @sets oThis.cacheKeys, oThis.invertedCacheKeys
   *
   * @return {object}
   */
  setCacheKeys() {
    const oThis = this;

    oThis.cacheKeys = {};

    for (let index = 0; index < oThis.ids.length; index++) {
      oThis.cacheKeys[oThis._cacheKeyPrefix() + 'cs_rdp_' + oThis.ids[index]] = oThis.ids[index].toString();
    }
    oThis.invertedCacheKeys = util.invert(oThis.cacheKeys);

    return oThis.cacheKeys;
  }

  /**
   * Set cache expiry in oThis.cacheExpiry and return it.
   *
   * @sets oThis.cacheExpiry
   *
   * @return {number}
   */
  setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 86400; // 24 hours

    return oThis.cacheExpiry;
  }

  /**
   * Fetch data from source.
   *
   * @param {array} cacheMissStrategyIds
   *
   * @returns {Promise<*|result|*>}
   */
  async fetchDataFromSource(cacheMissStrategyIds) {
    return new RedemptionProductModel().fetchRedemptionProductsByIds(cacheMissStrategyIds);
  }
}

module.exports = RedemptionProductCache;
