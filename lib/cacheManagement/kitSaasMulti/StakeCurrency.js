/**
 * Cache for stake currency entity by stake currency ids.
 *
 * @module lib/cacheManagement/kitSaasMulti/StakeCurrency
 */

const rootPrefix = '../../..',
  StakeCurrencyModel = require(rootPrefix + '/app/models/mysql/StakeCurrency'),
  BaseKitSaasMultiCacheManagement = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/Base'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

/**
 * Class for stake currency cache.
 *
 * @class StakeCurrencyCache
 */
class StakeCurrencyCache extends BaseKitSaasMultiCacheManagement {
  /**
   * Constructor for stake currency cache.
   *
   * @param {object} params: cache key generation & expiry related params
   * @param {array<string/number>} params.stakeCurrencyIds
   *
   * @augments BaseKitSaasMultiCacheManagement
   *
   * @constructor
   */
  constructor(params) {
    super();

    const oThis = this;

    oThis.stakeCurrencyIds = params.stakeCurrencyIds;

    // Call sub class method to set cache level.
    oThis._setCacheLevel();

    // Call sub class method to set cache keys using params provided.
    oThis._setCacheKeys();

    // Call sub class method to set inverted cache keys using params provided.
    oThis._setInvertedCacheKeys();

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

    oThis.cacheLevel = cacheManagementConst.kitSaasSubEnvLevel;
  }

  /**
   * Set cache keys.
   *
   * @sets oThis.saasCacheKeys
   * @sets oThis.kitCacheKeys
   *
   * @private
   */
  _setCacheKeys() {
    const oThis = this;

    // It uses shared cache key between company api and saas. Any changes in key here should be synced.
    for (let index = 0; index < oThis.stakeCurrencyIds.length; index++) {
      oThis.saasCacheKeys[oThis._saasCacheKeyPrefix() + 'c_stk_cur_' + oThis.stakeCurrencyIds[index]] =
        oThis.stakeCurrencyIds[index];
      oThis.kitCacheKeys[oThis._kitCacheKeyPrefix() + 'c_stk_cur_' + oThis.stakeCurrencyIds[index]] =
        oThis.stakeCurrencyIds[index];
    }
  }

  /**
   * Set cache expiry.
   *
   * @sets oThis.cacheExpiry
   *
   * @private
   */
  _setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 3 * 24 * 60 * 60; // 72 hours
  }

  /**
   * Fetch data from source.
   *
   * @param {array<string/number>} stakeCurrencyIds
   *
   * @returns {Promise<*>}
   * @private
   */
  _fetchDataFromSource(stakeCurrencyIds) {
    return new StakeCurrencyModel().fetchStakeCurrenciesByIds(stakeCurrencyIds);
  }
}

module.exports = StakeCurrencyCache;
