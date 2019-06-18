'use strict';

const rootPrefix = '../../..',
  AllQuoteCurrencySymbols = require(rootPrefix + '/lib/cacheManagement/shared/AllQuoteCurrencySymbols'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

class PricePointsFormatter {
  /**
   *
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
  async perform() {
    const oThis = this,
      formattedPricePointsData = {},
      pricePointData = {};

    let pricePointEntityData = oThis.params;

    await oThis._fetchQuoteCurrencies();

    for (let symbol in pricePointEntityData) {
      if (symbol == 'decimals') continue; // Skipping non-symbol key

      let pricePointEntity = pricePointEntityData[symbol];

      for (let ind = 0; ind < oThis.quoteCurrencies.length; ind++) {
        if (!pricePointEntity.hasOwnProperty(oThis.quoteCurrencies[ind])) {
          return oThis._returnError();
        }
      }

      if (!pricePointEntity.hasOwnProperty('updated_timestamp')) {
        return oThis._returnError();
      }

      for (let ind = 0; ind < oThis.quoteCurrencies.length; ind++) {
        pricePointData[oThis.quoteCurrencies[ind]] = parseFloat(pricePointEntity[oThis.quoteCurrencies[ind]]);
      }

      pricePointData['decimals'] = Number(pricePointEntityData.decimals);
      pricePointData['updated_timestamp'] = Number(pricePointEntity['updated_timestamp']);

      formattedPricePointsData[symbol] = pricePointData;
    }

    return responseHelper.successWithData(formattedPricePointsData);
  }

  /**
   * Fetch quote currencies
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchQuoteCurrencies() {
    const oThis = this;

    let allQuoteCurrencySymbols = new AllQuoteCurrencySymbols({});

    let cacheRsp = await allQuoteCurrencySymbols.fetch();
    oThis.quoteCurrencies = cacheRsp.data;
  }

  /**
   * Return error
   *
   * @return {Promise<never>}
   * @private
   */
  _returnError() {
    const oThis = this;

    return Promise.reject(
      responseHelper.error({
        internal_error_identifier: 'l_f_e_pp_1',
        api_error_identifier: 'entity_formatting_failed',
        debug_options: { pricePointsParams: oThis.params }
      })
    );
  }
}

module.exports = PricePointsFormatter;
