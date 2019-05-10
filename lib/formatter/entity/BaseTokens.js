/**
 * Formatter for base token entity to convert keys to snake case.
 *
 * @module lib/formatter/entity/Token
 */

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class for base tokens formatter.
 *
 * @class
 */
class BaseTokensFormatter {
  /**
   * Constructor for base tokens formatter.
   *
   * @param params
   */
  constructor(params) {
    const oThis = this;

    oThis.params = params;
  }

  /**
   * perform
   *
   * @returns {*}
   */
  perform() {
    const oThis = this,
      formattedBaseTokensData = {};

    if (!oThis.params.stakeCurrencyDetails) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_f_e_bt_1',
          api_error_identifier: 'entity_formatting_failed',
          debug_options: { baseTokensParams: oThis.params }
        })
      );
    }

    for (let stakeCurrencySymbol in oThis.params.stakeCurrencyDetails) {
      if (
        !oThis.params.stakeCurrencyDetails[stakeCurrencySymbol].hasOwnProperty('name') ||
        !oThis.params.stakeCurrencyDetails[stakeCurrencySymbol].hasOwnProperty('decimal') ||
        !oThis.params.stakeCurrencyDetails[stakeCurrencySymbol].hasOwnProperty('contractAddress')
      ) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'l_f_e_bt_2',
            api_error_identifier: 'entity_formatting_failed',
            debug_options: { baseTokensParams: oThis.params }
          })
        );
      }

      formattedBaseTokensData[stakeCurrencySymbol] = {};
      formattedBaseTokensData[stakeCurrencySymbol]['name'] =
        oThis.params.stakeCurrencyDetails[stakeCurrencySymbol].name;
      formattedBaseTokensData[stakeCurrencySymbol]['decimals'] = Number(
        oThis.params.stakeCurrencyDetails[stakeCurrencySymbol].decimal
      );
      formattedBaseTokensData[stakeCurrencySymbol]['origin_chain_erc20token_contract_address'] =
        oThis.params.stakeCurrencyDetails[stakeCurrencySymbol].contractAddress;
    }

    return responseHelper.successWithData(formattedBaseTokensData);
  }
}

module.exports = BaseTokensFormatter;
