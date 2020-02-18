/**
 * Module for userRedemption entity formatter.
 *
 * @module lib/formatter/entity/UserRedemption
 */

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class for userRedemption formatter.
 *
 * @class UserRedemptionFormatter
 */
class UserRedemptionFormatter {
  /**
   * Constructor for transaction formatter.
   *
   * @param {Object} params
   * @param {Number} params.uuid
   * @param {String} params.tokenRedemptionProductId
   * @param {String} params.amount
   * @param {String} params.currency
   * @param {String} params.transactionUuid
   * @param {String} params.emailAddress
   * @param {Number} params.status
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.params = params;
  }

  /**
   * Main performer for class.
   *
   * @return {{}}
   */
  perform() {
    const oThis = this,
      formattedTransactionData = {};

    if (
      !oThis.params.hasOwnProperty('uuid') ||
      !oThis.params.hasOwnProperty('tokenRedemptionProductId') ||
      !oThis.params.hasOwnProperty('amount') ||
      !oThis.params.hasOwnProperty('currency') ||
      !oThis.params.hasOwnProperty('transactionUuid') ||
      !oThis.params.hasOwnProperty('emailAddress') ||
      !oThis.params.hasOwnProperty('status')
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_f_e_tx_1',
          api_error_identifier: 'entity_formatting_failed',
          debug_options: { transactionParams: oThis.params }
        })
      );
    }

    formattedTransactionData.id = oThis.params.uuid;
    formattedTransactionData.redemption_product_id = oThis.params.tokenRedemptionProductId;
    formattedTransactionData.amount = oThis.params.amount;
    formattedTransactionData.currency = oThis.params.currency;
    formattedTransactionData.transaction_id = oThis.params.transactionUuid;
    formattedTransactionData.email = oThis.params.emailAddress;
    formattedTransactionData.status = oThis.params.status;

    return responseHelper.successWithData(formattedTransactionData);
  }
}

module.exports = UserRedemptionFormatter;
