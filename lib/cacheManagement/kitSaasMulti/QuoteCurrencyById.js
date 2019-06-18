/**
 * Cache for quote currency entity by quote currency ids.
 *
 * @module lib/cacheManagement/kitSaasMulti/QuoteCurrencyById
 */

const rootPrefix = '../../..',
  QuoteCurrencyModel = require(rootPrefix + '/app/models/mysql/QuoteCurrency'),
  BaseKitSaasMultiCacheManagement = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/Base'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

/**
 * Class for quote currency by id cache.
 *
 * @class QuoteCurrencyByIdCache
 */
class QuoteCurrencyByIdCache extends BaseKitSaasMultiCacheManagement {
  /**
   * Constructor for quote currency by id cache.
   *
   * @param {object} params: cache key generation & expiry related params
   * @param {array<string/number>} params.quoteCurrencyIds
   *
   * @augments BaseKitSaasMultiCacheManagement
   *
   * @constructor
   */
  constructor(params) {
    super();

    const oThis = this;

    oThis.quoteCurrencyIds = params.quoteCurrencyIds;
    oThis.cacheType = cacheManagementConst.inMemory;

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
    for (let index = 0; index < oThis.quoteCurrencyIds.length; index++) {
      oThis.saasCacheKeys[oThis._saasCacheKeyPrefix() + 'c_qt_cur_' + oThis.quoteCurrencyIds[index]] =
        oThis.quoteCurrencyIds[index];
      oThis.kitCacheKeys[oThis._kitCacheKeyPrefix() + 'c_qt_cur_' + oThis.quoteCurrencyIds[index]] =
        oThis.quoteCurrencyIds[index];
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

    oThis.cacheExpiry = 10 * 24 * 60 * 60; // 10 days
  }

  /**
   * Fetch data from source.
   *
   * @param {array<string/number>} quoteCurrencyIds
   *
   * @returns {Promise<*>}
   * @private
   */
  _fetchDataFromSource(quoteCurrencyIds) {
    return new QuoteCurrencyModel().fetchQuoteCurrencyByIds(quoteCurrencyIds);
  }
}

module.exports = QuoteCurrencyByIdCache;
