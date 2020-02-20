const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response');

// Declare constants.
const has = Object.prototype.hasOwnProperty; // Cache the lookup once, in module scope.

/**
 * Class for user redemption formatter.
 *
 * @class RedemptionFormatter
 */
class RedemptionFormatter {
  /**
   * Constructor for user redemption formatter.
   *
   * @param {number} params.id
   * @param {number} params.redemptionProductId
   * @param {number} params.amount
   * @param {string} params.currency
   * @param {number} params.transactionId
   * @param {string} params.status
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.params = params;
  }

  /**
   * Main performer for the class.
   *
   * @returns {Promise<never>|*|result}
   */
  perform() {
    const oThis = this;

    const redemptionData = {};

    if (
      !has.call(oThis.params, 'id') ||
      !has.call(oThis.params, 'tokenRedemptionProductId') ||
      !has.call(oThis.params, 'transactionId') ||
      !has.call(oThis.params, 'amount') ||
      !has.call(oThis.params, 'currency') ||
      !has.call(oThis.params, 'status')
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_f_e_re_1',
          api_error_identifier: 'entity_formatting_failed',
          debug_options: { redemptionParams: oThis.params }
        })
      );
    }

    redemptionData.id = oThis.params.id;
    redemptionData.redemption_product_id = oThis.params.tokenRedemptionProductId;
    redemptionData.amount = oThis.params.amount;
    redemptionData.currency = oThis.params.currency;
    redemptionData.transaction_id = oThis.params.transactionId;
    redemptionData.status = oThis.params.status;

    return responseHelper.successWithData(redemptionData);
  }
}

module.exports = RedemptionFormatter;
