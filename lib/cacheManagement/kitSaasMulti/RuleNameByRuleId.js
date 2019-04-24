/**
 * Cache to get rule name by rule id.
 *
 * @module lib/cacheManagement/kitSaasMulti/RuleNameByRuleId
 */

const rootPrefix = '../../..',
  RuleModel = require(rootPrefix + '/app/models/mysql/Rule'),
  BaseKitSaasMultiCacheManagement = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/Base'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

/**
 * Class to get rule name by rule id cache.
 *
 * @class RuleNameByRuleId
 */
class RuleNameByRuleId extends BaseKitSaasMultiCacheManagement {
  /**
   * Constructor to get rule name by rule id cache.
   *
   * @param {object} params: cache key generation & expiry related params
   * @param {array<string/number>} params.ruleIds
   *
   * @augments BaseKitSaasMultiCacheManagement
   *
   * @constructor
   */
  constructor(params) {
    super();

    const oThis = this;

    oThis.ruleIds = params.ruleIds;
    oThis.cacheType = cacheManagementConst.sharedMemcached;

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

    oThis.cacheLevel = cacheManagementConst.saasSubEnvLevel;
  }

  /**
   * Set cache keys.
   *
   * @sets oThis.saasCacheKeys
   *
   * @private
   */
  _setCacheKeys() {
    const oThis = this;

    // It uses shared cache key between company api and saas. Any changes in key here should be synced.
    for (let index = 0; index < oThis.ruleIds.length; index++) {
      oThis.saasCacheKeys[oThis._saasCacheKeyPrefix() + 'cm_ksm_rnbr_' + oThis.ruleIds[index]] = oThis.ruleIds[index];
      // NOTE: We are not setting kitCacheKeys here as the cacheLevel is only saasSubEnvLevel.
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

    oThis.cacheExpiry = 24 * 60 * 60; // 1 day;
  }

  /**
   * Fetch data from source.
   *
   * @param {array<string/number>} cacheMissRuleIds
   *
   * @return {Promise<*>}
   * @private
   */
  _fetchDataFromSource(cacheMissRuleIds) {
    return new RuleModel().getRuleDetails(cacheMissRuleIds);
  }
}

module.exports = RuleNameByRuleId;
