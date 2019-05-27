/**
 * Module to get client config strategy details from cache.
 *
 * @module /lib/cacheManagement/sharedMulti/ConfigStrategy
 */

const rootPrefix = '../../..',
  CacheManagementSharedMultiBase = require(rootPrefix + '/lib/cacheManagement/sharedMulti/Base'),
  ConfigStrategyModel = require(rootPrefix + '/app/models/mysql/ConfigStrategy'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  util = require(rootPrefix + '/lib/util'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

/**
 * Class to get client config strategy details from cache.
 *
 * @class ConfigStrategyCache
 */
class ConfigStrategyCache extends CacheManagementSharedMultiBase {
  /**
   * Constructor to get client config strategy details from cache.
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

    oThis.strategyIds = params.strategyIds;
    oThis.cacheType = cacheManagementConst.inMemory;
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

    for (let index = 0; index < oThis.strategyIds.length; index++) {
      oThis.cacheKeys[oThis._cacheKeyPrefix() + 'cs_sd_' + oThis.strategyIds[index]] = oThis.strategyIds[
        index
      ].toString();
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
    if (!cacheMissStrategyIds) {
      return responseHelper.error({
        internal_error_identifier: 'cmm_eca_1_config_strategy',
        api_error_identifier: 'invalid_addresses'
      });
    }

    const queryResponse = await new ConfigStrategyModel().getByIds(cacheMissStrategyIds);

    if (!queryResponse) {
      return responseHelper.error({
        internal_error_identifier: 'cmm_eca_2',
        api_error_identifier: 'no_data_found'
      });
    }

    return responseHelper.successWithData(queryResponse);
  }
}

module.exports = ConfigStrategyCache;
