'use strict';
/**
 * Formatter for Rules entity.
 *
 * @module lib/formatter/entity/Rule
 */
const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 *
 * @class RuleFormatter
 */
class RuleFormatter {
  /**
   * @constructor
   *
   * @param {Integer} params.id
   * @param {Integer} params.tokenId
   * @param {String} params.name
   * @param {String} params.address
   * @param {String} params.abi
   * @param {String} params.updatedTimestamp
   */
  constructor(params) {
    const oThis = this;
    oThis.params = params;
  }

  /**
   * Main performer method for the class.
   *
   */
  perform() {
    const oThis = this,
      formattedRulesData = {};

    if (
      !oThis.params.hasOwnProperty('id') ||
      !oThis.params.hasOwnProperty('tokenId') ||
      !oThis.params.hasOwnProperty('name') ||
      !oThis.params.hasOwnProperty('address') ||
      !oThis.params.hasOwnProperty('abi') ||
      !oThis.params.hasOwnProperty('updatedTimestamp')
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_f_e_r_1',
          api_error_identifier: 'entity_formatting_failed',
          debug_options: { ruleParams: oThis.params }
        })
      );
    }

    formattedRulesData['id'] = oThis.params.id;
    formattedRulesData['token_id'] = oThis.params.tokenId;
    formattedRulesData['name'] = oThis.params.name;
    formattedRulesData['address'] = oThis.params.address;
    formattedRulesData['abi'] = JSON.parse(oThis.params.abi);
    formattedRulesData['updated_timestamp'] = basicHelper.dateToSecondsTimestamp(oThis.params.updatedTimestamp);

    return responseHelper.successWithData(formattedRulesData);
  }
}

module.exports = RuleFormatter;
