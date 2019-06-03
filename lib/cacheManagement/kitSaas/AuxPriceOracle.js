'use strict';
/**
 * Aux Price oracle cache
 *
 * @module lib/cacheManagement/kitSaas/AuxPriceOracle
 */

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  AuxPriceOracleModel = require(rootPrefix + '/app/models/mysql/AuxPriceOracle'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  CacheManagementKitSaasBase = require(rootPrefix + '/lib/cacheManagement/kitSaas/Base');

/**
 * Class for chain address cache.
 *
 * @class
 */
class AuxPriceOracle extends CacheManagementKitSaasBase {
  /**
   * Constructor for chain address cache.
   *
   * @param {Object} params
   * @param {Number} params.auxChainId: auxiliary chain id
   * @param {Number} params.stakeCurrencyId: stake currency id
   * @param {Number} params.quoteCurrencyId: quote currency id
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.stakeCurrencyId = params.stakeCurrencyId;
    oThis.quoteCurrencyId = params.quoteCurrencyId;

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
   */
  _setCacheKeySuffix() {
    const oThis = this;
    oThis.cacheKeySuffix = 'c_a_p_o_' + oThis.auxChainId + '_' + oThis.stakeCurrencyId + '_' + oThis.quoteCurrencyId;
  }

  /**
   * Set cache expiry in oThis.cacheExpiry and return it
   *
   * @return {Number}
   */
  _setCacheExpiry() {
    const oThis = this;
    oThis.cacheExpiry = 3 * 24 * 60 * 60; // 3 days;
    return oThis.cacheExpiry;
  }

  /**
   * Fetch data from source.
   *
   * @return {Promise}
   *
   * @private
   */
  async _fetchDataFromSource() {
    const oThis = this;

    let auxPriceOracleModelObj = new AuxPriceOracleModel({});

    let response = auxPriceOracleModelObj.fetchPriceOracleDetails({
      chainId: oThis.auxChainId,
      stakeCurrencyId: oThis.stakeCurrencyId,
      quoteCurrencyId: oThis.quoteCurrencyId
    });

    return responseHelper.successWithData(response.data);
  }
}

module.exports = AuxPriceOracle;
