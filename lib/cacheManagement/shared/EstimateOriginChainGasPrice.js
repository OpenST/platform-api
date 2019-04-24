/**
 * Module to estimate origin chain gas price.
 *
 * @module lib/cacheManagement/shared/EstimateOriginChainGasPrice
 */
const rootPrefix = '../../..',
  CacheManagementSharedBase = require(rootPrefix + '/lib/cacheManagement/shared/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

/**
 * Class to estimate origin chain gas price.
 *
 * @class EstimateOriginChainGasPriceCacheKlass
 */
class EstimateOriginChainGasPriceCacheKlass extends CacheManagementSharedBase {
  /**
   * Constructor to estimate origin chain gas price.
   *
   * @param {object} params
   *
   * @augments CacheManagementSharedBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.cacheType = cacheManagementConst.sharedMemcached;
    oThis.consistentBehavior = '1';
    oThis.useObject = false;

    // Call sub class method to set cache level.
    oThis._setCacheLevel();

    // Call sub class method to set cache key using params provided.
    oThis.setCacheKey();

    // Call sub class method to set cache expiry using params provided.
    oThis.setCacheExpiry();

    // Call sub class method to set cache implementer using params provided.
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
   * @sets oThis.cacheKey
   *
   * @returns {string}
   */
  setCacheKey() {
    const oThis = this;

    oThis.cacheKey = oThis._sharedCacheKeyPrefix() + 'c_evc_gp';

    return oThis.cacheKey;
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

    oThis.cacheExpiry = 600; // 10 minutes

    return oThis.cacheExpiry;
  }

  /**
   * Fetch data from source
   *
   * @return {Result}
   */
  async fetchDataFromSource() {
    // This value is only returned if cache is not set.
    // Cache is set by cron with appropriate value.
    const gasPriceToBeSubmittedHex = coreConstants.DEFAULT_ORIGIN_GAS_PRICE;

    return responseHelper.successWithData(gasPriceToBeSubmittedHex);
  }
}

module.exports = EstimateOriginChainGasPriceCacheKlass;
