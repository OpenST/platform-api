/**
 * Cache to stake currency entity by stake currency ids.
 *
 * @module lib/cacheManagement/kitSaasMulti/StakeCurrency
 */

const rootPrefix = '../../..',
  StakeCurrencyModel = require(rootPrefix + '/app/models/mysql/StakeCurrency'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  BaseKitSaasMultiCacheManagement = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/Base');

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
    super(params);

    const oThis = this;

    oThis.stakeCurrencyIds = params.stakeCurrencyIds;

    // Call sub class method to set cache level.
    oThis._setCacheLevel();

    // Call sub class method to set cache key using params provided.
    oThis._setCacheKeys();

    oThis._setInvertedCacheKeys();

    // Call sub class method to set cache expiry using params provided.
    oThis._setCacheExpiry();

    // Call sub class method to set cache implementer using params provided.
    oThis._setCacheImplementer();
  }

  /**
   * Set cache level.
   *
   * @private
   */
  _setCacheLevel() {
    const oThis = this;

    oThis.cacheLevel = cacheManagementConst.saasSubEnvLevel;
  }

  /**
   * Set cache keys.
   *
   * @private
   */
  _setCacheKeys() {
    const oThis = this;

    // It uses shared cache key between company api and saas. Any changes in key here should be synced.
    for (let index = 0; index < oThis.stakeCurrencyIds.length; index++) {
      oThis.cacheKeys[oThis._cacheKeyPrefix() + 'cm_ksm_sc_' + oThis.stakeCurrencyIds[index]] =
        oThis.stakeCurrencyIds[index];
    }
  }

  /**
   * Set cache expiry in oThis.cacheExpiry.
   *
   * @private
   */
  _setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 3 * 24 * 60 * 60; // 72 hours ;
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
