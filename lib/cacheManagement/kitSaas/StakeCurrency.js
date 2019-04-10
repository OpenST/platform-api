/**
 * Cache class for stake currencies.
 *
 * @module lib/cacheManagement/kitSaas/StakeCurrency
 */

const rootPrefix = '../../..',
  StakeCurrencyModel = require(rootPrefix + '/app/models/mysql/StakeCurrency'),
  BaseCacheManagement = require(rootPrefix + '/lib/cacheManagement/kitSaas/Base'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

/**
 * Class for stake currencies cache.
 *
 * @class StakeCurrenciesCache
 */
class StakeCurrenciesCache extends BaseCacheManagement {
  /**
   * Constructor for stake currencies cache.
   *
   * @param {object} params
   * @param {string/number} params.stakeCurrencyId
   *
   * @augments BaseCacheManagement
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.stakeCurrencyId = params.stakeCurrencyId;

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
   *
   * @private
   */
  _setCacheKeySuffix() {
    const oThis = this;

    oThis.cacheKeySuffix = 'sc_' + oThis.stakeCurrencyId;
  }

  /**
   * Set cache expiry in oThis.cacheExpiry and return it.
   *
   * @return {number}
   * @private
   */
  _setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 3 * 24 * 60 * 60; // 72 hours ;

    return oThis.cacheExpiry;
  }

  /**
   * Fetch data from source
   *
   * @return {Result}
   */
  async _fetchDataFromSource() {
    const oThis = this;

    return new StakeCurrencyModel().fetchStakeCurrencyById(oThis.stakeCurrencyId);
  }
}

module.exports = StakeCurrenciesCache;
