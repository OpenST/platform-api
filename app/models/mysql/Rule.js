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
   * @param {String} params.tokenId
   * @param {String} params.name
   * @param {String} params.kind
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
        tokenId: params.tokenId || 0,
        name: params.name,
        kind: ruleConstants.invertedKinds[params.kind],
        abi: JSON.stringify(params.abi)
      })
      .fire();

    await Rule.flushCache(params.tokenId, params.name);

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

  /***
   * Flush cache
   *
   * @param {Number} tokenId
   * @param {String} name
   *
   * @returns {Promise<*>}
   */
  static flushCache(tokenId, name) {
    let Cache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Rule');
    return new Cache({ tokenId: tokenId, name: name }).clear();
  }
}

module.exports = Rule;
