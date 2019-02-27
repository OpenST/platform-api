'use strict';

/**
 *  Cache to get rule name by rule id.
 *
 * @module lib/cacheManagement/kitSaasMulti/RuleNameByRuleId
 */

const rootPrefix = '../../..',
  RuleModel = require(rootPrefix + '/app/models/mysql/Rule'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  BaseKitSaasMultiCacheManagement = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/Base');

class RuleNameByRuleId extends BaseKitSaasMultiCacheManagement {
  /**
   * Constructor for token shard numbers cache
   *
   * @param {Object} params - cache key generation & expiry related params
   * @param params.ruleIds {Array} - [1,2]
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.ruleIds = params.ruleIds;

    // Call sub class method to set cache level
    oThis._setCacheLevel();

    // Call sub class method to set cache key using params provided
    oThis._setCacheKeys();

    oThis._setInvertedCacheKeys();

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
   * Set cache keys
   *
   */
  _setCacheKeys() {
    const oThis = this;

    // It uses shared cache key between company api and saas. any changes in key here should be synced
    for (let i = 0; i < oThis.ruleIds.length; i++) {
      oThis.cacheKeys[oThis._cacheKeyPrefix() + 'cm_ksm_rnbr_' + oThis.ruleIds[i]] = oThis.ruleIds[i];
    }
  }

  /**
   * set cache expiry in oThis.cacheExpiry
   */
  _setCacheExpiry() {
    const oThis = this;
    oThis.cacheExpiry = 24 * 60 * 60; // 1 day;
  }

  /**
   * Fetch data from source
   *
   * @param cacheMissRuleIds
   * @returns {Promise}
   * @private
   */
  _fetchDataFromSource(cacheMissRuleIds) {
    return new RuleModel().getRuleDetails(cacheMissRuleIds);
  }
}

module.exports = RuleNameByRuleId;
