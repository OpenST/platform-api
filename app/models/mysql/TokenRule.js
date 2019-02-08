'use strict';
/**
 * This is model for token_rules table.
 *
 * @module app/models/mysql/TokenRule
 */
const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  tokenRuleConstants = require(rootPrefix + '/lib/globalConstant/tokenRule');

// Declare variables.
const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

/**
 * Class for token rules model.
 *
 * @class
 */
class TokenRule extends ModelBase {
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
    oThis.tableName = 'token_rules';
  }

  /**
   * This method inserts an entry in the table.
   *
   * @param {Object} params
   * @param {String} params.tokenId
   * @param {String} params.ruleId
   * @param {String} params.address
   * @param {String} params.status
   *
   * @returns {*}
   */
  async insertRecord(params) {
    const oThis = this;

    oThis._validateInputParams(params);

    let insertResponse = await oThis
      .insert({
        token_id: params.tokenId,
        rule_id: params.ruleId,
        address: params.address.toLowerCase(),
        status: tokenRuleConstants.invertedStatus[params.status]
      })
      .fire();

    return Promise.resolve(responseHelper.successWithData(insertResponse.insertId));
  }

  /**
   * This method updates status.
   *
   * @param tokenId
   * @param ruleId
   * @param status
   * @return {Promise<void>}
   */
  async updateStatus(tokenId, ruleId, status) {
    const oThis = this;

    let whereClause = ['token_id = ? AND rule_id = ?', tokenId, ruleId];

    return oThis
      .update({
        status: tokenRuleConstants.invertedStatus[status]
      })
      .where(whereClause)
      .fire();
  }

  /**
   *
   * @param tokenId
   * @return {Promise<*|result>}
   */
  async getDetailsByTokenId(tokenId) {
    const oThis = this;

    let details = await oThis
      .select('*')
      .where(['token_id = ?', tokenId])
      .fire();

    if (details.length === 0) {
      logger.error('No entry found for given chainId and group Id');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_m_m_cg_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return details[0];
  }

  _validateInputParams(params) {
    const oThis = this;

    // Perform validations.
    if (
      !params.hasOwnProperty('tokenId') ||
      !params.hasOwnProperty('ruleId') ||
      !params.hasOwnProperty('address') ||
      !params.hasOwnProperty('status')
    ) {
      logger.error(
        'Mandatory parameters are missing. Expected an object with the following keys: {tokenId, ruleId, address, status}'
      );
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_m_m_tr_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            input_params: params
          }
        })
      );
    }
    return Promise.resolve(responseHelper.successWithData({}));
  }

  /***
   * Flush cache
   *
   * @returns {Promise<*>}
   */
  static flushCache() {}
}

module.exports = TokenRule;
