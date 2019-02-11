'use strict';
/**
 * This is model for Token Company User table.
 *
 * @module app/models/mysql/TokenCompanyUser
 */
const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

// Declare variables.
const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

/**
 * Class for Token Company User model.
 *
 * @class
 */
class TokenCompanyUser extends ModelBase {
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
    oThis.tableName = 'company_token_holders';
  }

  /**
   * This method inserts an entry in the table.
   *
   * @param {Object} params
   * @param {String} params.tokenId
   * @param {String} params.userUuid
   *
   * @returns {*}
   */
  async insertRecord(params) {
    const oThis = this;

    // Perform validations.
    if (!params.hasOwnProperty('tokenId') || !params.hasOwnProperty('userUuid')) {
      throw 'Mandatory parameters are missing. Expected an object with the following keys: {tokenId, userUuid}';
    }

    let insertResponse = await oThis
      .insert({
        token_id: params.tokenId,
        user_uuid: params.userUuid
      })
      .fire();

    return Promise.resolve(responseHelper.successWithData(insertResponse.insertId));
  }

  /**
   * Get user_uuid from table for given token id
   *
   * @param {String} tokenId
   *
   * @returns {*}
   */
  async getDetailsByTokenId(tokenId) {
    const oThis = this;

    let userUuids = [],
      whereClause = ['token_id = ?', tokenId];

    let dbRows = await oThis
      .select('*')
      .where(whereClause)
      .fire();

    if (dbRows.length === 0) {
      return responseHelper.successWithData({ userUuids: [] });
    }

    for (let i = 0; i < dbRows.length; i++) {
      userUuids.push(dbRows[i].user_uuid);
    }

    return responseHelper.successWithData({
      userUuids: userUuids
    });
  }
}

module.exports = TokenCompanyUser;
