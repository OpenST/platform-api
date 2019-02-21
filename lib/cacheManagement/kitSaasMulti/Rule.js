'use strict';

/**
 *
 * @module lib/cacheManagement/kitSaasMulti/Rule
 */

const rootPrefix = '../../..',
  RuleModel = require(rootPrefix + '/app/models/mysql/Rule'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  BaseKitSaasMultiCacheManagement = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/Base');

class Rule extends BaseKitSaasMultiCacheManagement {
  /**
   * Constructor for token shard numbers cache
   *
   * @param {Object} params - cache key generation & expiry related params
   * @param params.ruleTokenIdNames {Array} - ruleTokenId_Name['2_Pricer','3_Direct Transfer']
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.ruleTokenIdNames = params.ruleTokenIdNames;

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
   * Sanitize keys.
   *
   * @param key
   * @returns {String}
   * @private
   */
  _sanitizeKeys(key) {
    return encodeURIComponent(key.toLowerCase());
  }

  /**
   * Set cache keys
   *
   */
  _setCacheKeys() {
    const oThis = this;

    // It uses shared cache key between company api and saas. any changes in key here should be synced
    for (let i = 0; i < oThis.ruleTokenIdNames.length; i++) {
      let ruleTokenIdName = oThis._sanitizeKeys(oThis.ruleTokenIdNames[i]);
      oThis.cacheKeys[oThis._cacheKeyPrefix() + 'cm_ksm_r_' + ruleTokenIdName] = oThis.ruleTokenIdNames[i];
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
   * fetch data from source
   *
   * @return {Result}
   */
  async _fetchDataFromSource(cacheMissRuleTokenIdNames) {
    const finalResponse = {};

    let whereClause = [[]];

    for (let index = 0; index < cacheMissRuleTokenIdNames.length; index++) {
      let eachItem = cacheMissRuleTokenIdNames[index],
        items = eachItem.split('_');

      whereClause[0].push('(token_id = ? AND name = ?)');
      whereClause.push(items[0]);
      whereClause.push(items[1]);
    }
    whereClause[0] = whereClause[0].join(' OR ');

    let resp = await new RuleModel()
      .select('*')
      .where(whereClause)
      .fire();

    for (let i = 0; i < resp.length; i++) {
      let eachRow = resp[i],
        key = eachRow.token_id + '_' + eachRow.name;
      finalResponse[key] = eachRow;
    }

    return responseHelper.successWithData(finalResponse);
  }
}

module.exports = Rule;
