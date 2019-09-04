/**
 * Cache for BaseCurrency.
 *
 * @module lib/cacheManagement/chain/BaseCurrencyBySymbol
 */
const OSTBase = require('@ostdotcom/base');

const rootPrefix = '../../..',
  ChainCacheManagementBase = require(rootPrefix + '/lib/cacheManagement/chain/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

const InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/app/models/ddb/shared/BaseCurrency');

class BaseCurrencyCache extends ChainCacheManagementBase {
  /**
   * Constructor for base currency by symbol cache.
   *
   * @param {String} params.symbol
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

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
   * set cache key
   *
   * @return {String}
   */
  _setCacheKey() {
    const oThis = this;

    oThis.cacheKey = oThis._cacheKeyPrefix() + 'l_cm_c_bcbs';

    return oThis.cacheKey;
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   *
   * @return {Number}
   */
  _setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 3 * 24 * 60 * 60; // 3 days;

    return oThis.cacheExpiry;
  }

  /**
   * fetch data from source
   *
   * @return {Result}
   */
  async fetchDataFromSource() {
    const oThis = this,
      BaseCurrency = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BaseCurrency');

    let response = await new BaseCurrency({}).getBaseCurrencies();

    return responseHelper.successWithData(response.data);
  }
}

InstanceComposer.registerAsShadowableClass(BaseCurrencyCache, coreConstants.icNameSpace, 'BaseCurrencyCache');

module.exports = {};
