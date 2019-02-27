'use strict';
/**
 * This is model for rules table.
 *
 * @module app/models/mysql/Rule
 */
const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ruleConstants = require(rootPrefix + '/lib/globalConstant/rule');

// Declare variables.
const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

/**
 * Class for rules model.
 *
 * @class
 */
class Rule extends ModelBase {
  /**
   * Constructor
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });
    const oThis = this;
    oThis.tableName = 'rules';
  }

  /**
   * This method inserts an entry in the table.
   *
   * @param {Object} params
   * @param {Integer} params.tokenId
   * @param {String} params.name
   * @param {Integer} params.kind
   * @param {String} params.abi
   *
   * @returns {*}
   */
  async insertRecord(params) {
    const oThis = this;

    // Perform validations.
    if (!params.hasOwnProperty('name') || !params.hasOwnProperty('kind') || !params.hasOwnProperty('abi')) {
      throw 'Mandatory parameters are missing. Expected an object with the following keys: {rule name, rule kind, rule abi}';
    }

    let insertResponse = await oThis
      .insert({
        token_id: params.tokenId || 0,
        name: params.name,
        kind: ruleConstants.invertedKinds[params.kind],
        abi: JSON.stringify(params.abi)
      })
      .fire();

    let cacheParams = {
      tokenId: params.tokenId,
      name: params.name,
      ruleIds: [insertResponse.id]
    };

    await Rule.flushCache(cacheParams);

    return Promise.resolve(responseHelper.successWithData(insertResponse.insertId));
  }

  /**
   *
   * @param {Integer} tokenId
   * @param {String} name
   *
   * @return {Promise<*|result>}
   */
  async getDetails(tokenId, name) {
    const oThis = this;

    let dbRows = await oThis
      .select('*')
      .where({
        token_id: tokenId,
        name: name
      })
      .fire();

    if (dbRows.length === 0) {
      return responseHelper.successWithData({});
    }

    let dbRow = dbRows[0];

    return responseHelper.successWithData({
      id: dbRow.id,
      name: dbRow.name,
      kind: dbRow.kind,
      abi: dbRow.abi
    });
  }

  /**
   *
   * @param {Array} ruleIds
   *
   * @return {Promise<*|result>}
   */
  async getRuleDetails(ruleIds) {
    const oThis = this,
      response = {};

    let dbRows = await oThis
      .select('id, name')
      .where(['id IN (?)', ruleIds])
      .fire();

    if (dbRows.length === 0) {
      return responseHelper.successWithData({});
    }

    for (let index = 0; index < dbRows.length; index++) {
      response[dbRows[index].id] = {
        name: dbRows[index].name
      };
    }

    return responseHelper.successWithData(response);
  }
  /**
   *
   * Fetch Pricer Rule Details
   *
   * @return {Promise<result>}
   */
  static async getPricerRuleDetails() {
    let RuleCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/Rule'),
      tokenId = 0,
      name = ruleConstants.pricerRuleName,
      ruleTokenIdNames = ruleConstants.getKey(tokenId, name);

    let ruleCache = new RuleCache({ ruleTokenIdNames: [ruleTokenIdNames] }),
      ruleCacheRsp = await ruleCache.fetch();

    if (ruleCacheRsp.isFailure() || !ruleCacheRsp.data) {
      return Promise.reject(ruleCacheRsp);
    }

    let ruleCacheRspData = ruleCacheRsp.data[ruleTokenIdNames];
    return responseHelper.successWithData(ruleCacheRspData);
  }

  /**
   *
   * Fetch Token Rule Details
   *
   * @return {Promise<result>}
   */
  static async getTokenRuleDetails() {
    let RuleCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/Rule'),
      tokenId = 0,
      name = ruleConstants.tokenRuleName,
      ruleTokenIdNames = ruleConstants.getKey(tokenId, name);

    let ruleCache = new RuleCache({ ruleTokenIdNames: [ruleTokenIdNames] }),
      ruleCacheRsp = await ruleCache.fetch();

    if (ruleCacheRsp.isFailure() || !ruleCacheRsp.data) {
      return Promise.reject(ruleCacheRsp);
    }

    let ruleCacheRspData = ruleCacheRsp.data[ruleTokenIdNames];
    return responseHelper.successWithData(ruleCacheRspData);
  }

  /**
   * Flush cache.
   *
   * @param {Object} params
   * @param {Number} params.tokenId
   * @param {String} params.name
   * @param {Array} params.ruleIds
   *
   * @returns {Promise<void>}
   */
  static async flushCache(params) {
    let Cache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/Rule'),
      ruleTokenIdNames = ruleConstants.getKey(params.tokenId, params.name);
    await new Cache({ ruleTokenIdNames: [ruleTokenIdNames] }).clear();

    let RuleNameByRuleId = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/RuleNameByRuleId');
    await new RuleNameByRuleId({ ruleIds: params.ruleIds }).clear();
  }
}

module.exports = Rule;
