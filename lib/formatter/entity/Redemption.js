'use strict';
/**
 * Formatter for Redemption entity.
 *
 * @module lib/formatter/entity/Redemption
 */
const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class for redemption formatter.
 *
 * @class RedemptionFormatter
 */
class RedemptionFormatter {
  /**
   * Constructor for recovery owner formatter.
   *
   * @param {number} params.id
   * @param {number} params.redemptionProductId
   * @param {number} params.amount
   * @param {string} params.currency
   * @param {number} params.transactionId
   * @param {string} params.status
   *
   * @set oThis.params
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.params = params;
  }

  /**
   * Main performer method for the class.
   */
  perform() {
    const oThis = this,
      redemptionData = {};

    if (
      !oThis.params.hasOwnProperty('id') ||
      !oThis.params.hasOwnProperty('redemptionProductId') ||
      !oThis.params.hasOwnProperty('amount') ||
      !oThis.params.hasOwnProperty('currency') ||
      !oThis.params.hasOwnProperty('status')
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_f_e_re_1',
          api_error_identifier: 'entity_formatting_failed',
          debug_options: { redemptionParams: oThis.params }
        })
      );
    }

    redemptionData['id'] = oThis.params.id;
    redemptionData['redemption_product_id'] = oThis.params.redemptionProductId;
    redemptionData['amount'] = oThis.params.amount;
    redemptionData['currency'] = oThis.params.currency;
    redemptionData['transaction_id'] = oThis.params.transactionId;
    redemptionData['status'] = oThis.params.status;

    return responseHelper.successWithData(redemptionData);
  }
}

module.exports = RedemptionFormatter;
