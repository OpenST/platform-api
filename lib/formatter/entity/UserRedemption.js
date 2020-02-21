const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response');

// Declare constants.
const has = Object.prototype.hasOwnProperty; // Cache the lookup once, in module scope.

/**
 * Class for user redemption formatter.
 *
 * @class UserRedemptionFormatter
 */
class UserRedemptionFormatter {
  /**
   * Constructor for user redemption formatter.
   *
   * @param {object} params
   * @param {string} params.uuid
   * @param {string} params.tokenRedemptionProductId
   * @param {string/number} params.amount
   * @param {string} params.countryIsoCode
   * @param {string} params.currencyIsoCode
   * @param {string} params.transactionUuid
   * @param {string} params.emailAddress
   * @param {string} params.status
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
      !has.call(oThis.params, 'uuid') ||
      !has.call(oThis.params, 'tokenRedemptionProductId') ||
      !has.call(oThis.params, 'transactionUuid') ||
      !has.call(oThis.params, 'amount') ||
      !has.call(oThis.params, 'countryIsoCode') ||
      !has.call(oThis.params, 'currencyIsoCode') ||
      !has.call(oThis.params, 'emailAddress') ||
      !has.call(oThis.params, 'status')
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
    formattedTransactionData.redeemable_sku_id = oThis.params.tokenRedemptionProductId;
    formattedTransactionData.amount_in_fiat = oThis.params.amount;
    formattedTransactionData.country_iso_code = oThis.params.countryIsoCode;
    formattedTransactionData.currency_iso_code = oThis.params.currencyIsoCode;
    formattedTransactionData.transaction_id = oThis.params.transactionUuid;
    formattedTransactionData.email = oThis.params.emailAddress;
    formattedTransactionData.status = oThis.params.status;

    return responseHelper.successWithData(formattedTransactionData);
  }
}

module.exports = UserRedemptionFormatter;
