/**
 * Cache for quote currencies fetch by symbol
 *
 * @module lib/cacheManagement/kitSaasMulti/QuoteCurrencyBySymbol
 */

const rootPrefix = '../../..',
  QuoteCurrencyModel = require(rootPrefix + '/app/models/mysql/QuoteCurrency'),
  BaseKitSaasMultiCacheManagement = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/Base'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

/**
 * Class for quote currency by symbol cache.
 *
 * @class QuoteCurrencyBySymbolCache
 */
class QuoteCurrencyBySymbolCache extends BaseKitSaasMultiCacheManagement {
  /**
   * Constructor for stake currency cache.
   *
   * @param {object} params: cache key generation & expiry related params
   * @param {array<string/number>} params.quoteCurrencySymbols
   *
   * @augments BaseKitSaasMultiCacheManagement
   *
   * @constructor
   */
  constructor(params) {
    super();

    const oThis = this;

    oThis.quoteCurrencySymbols = params.quoteCurrencySymbols;
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
    for (let index = 0; index < oThis.quoteCurrencySymbols.length; index++) {
      oThis.saasCacheKeys[oThis._saasCacheKeyPrefix() + 'c_qt_cur_sym_' + oThis.quoteCurrencySymbols[index]] =
        oThis.quoteCurrencySymbols[index];

      oThis.kitCacheKeys = {}; // Setting empty since this is an inMemory cache on kit side
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
   * @param {array<string/number>} quoteCurrencySymbols
   *
   * @returns {Promise<*>}
   * @private
   */
  _fetchDataFromSource(quoteCurrencySymbols) {
    return new QuoteCurrencyModel().fetchQuoteCurrencyBySymbols(quoteCurrencySymbols);
  }
}

module.exports = QuoteCurrencyBySymbolCache;
