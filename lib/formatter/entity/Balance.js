'use strict';
/**
 * Formatter for Balance entity.
 *
 * @module lib/formatter/entity/Balance
 */
const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 *
 * @class BalanceFormatter
 */
class BalanceFormatter {
  /**
   * @constructor
   *
   * @param {Integer} params.userId
   * @param {Integer} params.blockChainSettledBalance
   * @param {String} params.blockChainUnsettleDebits
   * @param {String} params.pessimisticSettledBalance
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
      formattedBalanceData = {};

    if (
      !oThis.params.hasOwnProperty('userId') ||
      !oThis.params.hasOwnProperty('blockChainSettledBalance') ||
      !oThis.params.hasOwnProperty('blockChainUnsettleDebits') ||
      !oThis.params.hasOwnProperty('pessimisticSettledBalance') ||
      !oThis.params.hasOwnProperty('updatedTimestamp')
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_f_e_b_1',
          api_error_identifier: 'entity_formatting_failed',
          debug_options: { balanceParams: oThis.params }
        })
      );
    }

    formattedBalanceData['user_id'] = oThis.params.userId;
    formattedBalanceData['total_balance'] = oThis.params.blockChainSettledBalance || '0';
    formattedBalanceData['available_balance'] = oThis.params.pessimisticSettledBalance || '0';
    formattedBalanceData['unsettled_debit'] = oThis.params.blockChainUnsettleDebits || '0';
    formattedBalanceData['updated_timestamp'] = Number(oThis.params.updatedTimestamp);

    return responseHelper.successWithData(formattedBalanceData);
  }
}

module.exports = BalanceFormatter;
