'use strict';
/**
 * Inserts Pricer Rule ABI into rules table
 *
 *
 * @module lib/setup/InsertPricerAbiIntoRulesTable
 */

const rootPrefix = '../..',
  RuleModel = require(rootPrefix + '/app/models/mysql/Rule'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ruleConstants = require(rootPrefix + '/lib/globalConstant/rule');

const OpenStJs = require('@openstfoundation/openst.js');

/**
 * Class
 *
 * @class
 */
class InsertIntoRulesTables {
  /**
   * Constructor
   *
   * @constructor
   */
  constructor() {}

  /**
   * Performer
   *
   * @return {Promise<result>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error(`${__filename}::perform::catch`);
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'L_s_ipairt_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: { error: error.toString() }
        });
      }
    });
  }

  /**
   * Async performer
   *
   * @private
   *
   * @return {Promise<result>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis.insertIntoRulesTable();

    return Promise.resolve(responseHelper.successWithData({}));
  }

  async insertIntoRulesTable() {
    const oThis = this;

    // AbiBinProvider of openst.js
    let OpenStJsAbiBinProvider = OpenStJs.AbiBinProvider,
      OpenStJsAbiBinProviderHelper = new OpenStJsAbiBinProvider();

    // get pricer abi
    const pricerAbi = OpenStJsAbiBinProviderHelper.getABI(ruleConstants.pricerRuleContractName);

    let insertParams = {
      name: ruleConstants.pricerRuleName,
      kind: ruleConstants.pricerKind,
      abi: pricerAbi
    };

    let queryResponse = await new RuleModel().insertRecord(insertParams);

    if (!queryResponse || !queryResponse.isSuccess()) {
      return Promise.reject(queryResponse);
    }

    return Promise.resolve(queryResponse);
  }
}

module.exports = InsertIntoRulesTables;
