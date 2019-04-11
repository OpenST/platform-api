/**
 * Cache for rules by rule token ids names.
 *
 * @module lib/cacheManagement/kitSaasMulti/Rule
 */

const rootPrefix = '../../..',
  RuleModel = require(rootPrefix + '/app/models/mysql/Rule'),
  BaseKitSaasMultiCacheManagement = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

/**
 * Class for rules cache by token id names.
 *
 * @class Rule
 */
class Rule extends BaseKitSaasMultiCacheManagement {
  /**
   * Constructor for rules cache by token id names.
   *
   * @param {object} params: cache key generation & expiry related params
   * @param {array<string>} params.ruleTokenIdNames
   *
   * @augments BaseKitSaasMultiCacheManagement
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.ruleTokenIdNames = params.ruleTokenIdNames;

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
   * Sanitize keys.
   *
   * @param {string} key
   *
   * @returns {string}
   * @private
   */
  _sanitizeKeys(key) {
    return encodeURIComponent(key.toLowerCase());
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
    for (let index = 0; index < oThis.ruleTokenIdNames.length; index++) {
      const ruleTokenIdName = oThis._sanitizeKeys(oThis.ruleTokenIdNames[index]);
      oThis.saasCacheKeys[oThis._saasCacheKeyPrefix() + 'cm_ksm_r_' + ruleTokenIdName] = oThis.ruleTokenIdNames[index];
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
   * @param {array<string/number>} cacheMissRuleTokenIdNames
   *
   * @return {Promise<*|result>}
   * @private
   */
  async _fetchDataFromSource(cacheMissRuleTokenIdNames) {
    const finalResponse = {};

    const whereClause = [[]];

    for (let index = 0; index < cacheMissRuleTokenIdNames.length; index++) {
      const eachItem = cacheMissRuleTokenIdNames[index],
        items = eachItem.split('_');

      whereClause[0].push('(token_id = ? AND name = ?)');
      whereClause.push(items[0]);
      whereClause.push(items[1]);
    }

    whereClause[0] = whereClause[0].join(' OR ');

    const resp = await new RuleModel()
      .select('*')
      .where(whereClause)
      .fire();

    for (let index = 0; index < resp.length; index++) {
      const eachRow = resp[index],
        key = eachRow.token_id + '_' + eachRow.name;
      finalResponse[key] = eachRow;
    }

    return responseHelper.successWithData(finalResponse);
  }
}

module.exports = Rule;
