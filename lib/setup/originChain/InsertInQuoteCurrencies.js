'use strict';
/**
 * Insert in quote currency table
 *
 * @module lib/setup/originChain/InsertInQuoteCurrencies
 */

const rootPrefix = '../../..',
  QuoteCurrencyModel = require(rootPrefix + '/app/models/mysql/QuoteCurrency'),
  quoteCurrencyConstants = require(rootPrefix + '/lib/globalConstant/quoteCurrency'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 *
 * @class InsertInQuoteCurrencies
 */
class InsertInQuoteCurrencies {
  /**
   * Constructor to save quote currency details in quote currencies
   *
   * @param {object} params
   * @param {string} params.name - quote currency name
   * @param {string} params.symbol - quote currency symbol
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;
    oThis.name = params.name;
    oThis.symbol = params.symbol;
  }

  /**
   * Perform.
   *
   * @return {Promise<result>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      }
      logger.error('lib/setup/originChain/InsertInQuoteCurrencies.js::perform::catch');
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 'l_s_oc_iiqc_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: { err: error.toString() }
      });
    });
  }

  /**
   * Async perform.
   *
   * @return {Promise<string>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._insertInQuoteCurrencies();

    return 'Quote currency details successfully inserted in quote currencies.';
  }

  /**
   * Create quote currency entry in quote currencies table.
   *
   * @return {Promise<void>}
   * @private
   */
  async _insertInQuoteCurrencies() {
    const oThis = this;

    return new QuoteCurrencyModel()
      .insert({
        name: oThis.name,
        symbol: oThis.symbol,
        status: quoteCurrencyConstants.invertedStatuses[quoteCurrencyConstants.inactiveStatus]
      })
      .fire();
  }
}

module.exports = InsertInQuoteCurrencies;
