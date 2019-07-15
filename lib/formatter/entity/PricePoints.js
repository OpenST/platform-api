/**
 * Module to format price points entity.
 *
 * @module lib/formatter/entity/PricePoints
 */

const rootPrefix = '../../..',
  AllQuoteCurrencySymbols = require(rootPrefix + '/lib/cacheManagement/shared/AllQuoteCurrencySymbols'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class to format price points entity.
 *
 * @class PricePointsFormatter
 */
class PricePointsFormatter {
  /**
   * Constructor to format price points entity.
   *
   * @param params
   */
  constructor(params) {
    const oThis = this;

    oThis.params = params;
  }

  /**
   * Perform.
   *
   * @returns {*}
   */
  async perform() {
    const oThis = this,
      formattedPricePointsData = {},
      pricePointData = {};

    const pricePointEntityData = oThis.params;

    console.log('======pricePointEntityData========', pricePointEntityData);

    await oThis._fetchQuoteCurrencies();

    for (const symbol in pricePointEntityData) {
      if (symbol === 'decimals') {
        continue;
      } // Skipping non-symbol key

      const pricePointEntity = pricePointEntityData[symbol];

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

      pricePointData.decimals = Number(pricePointEntityData.decimals);
      pricePointData.updated_timestamp = Number(pricePointEntity.updated_timestamp);

      formattedPricePointsData[symbol] = pricePointData;
    }

    console.log('=======formattedPricePointsData=====', formattedPricePointsData);

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

    const allQuoteCurrencySymbols = new AllQuoteCurrencySymbols({});

    const cacheRsp = await allQuoteCurrencySymbols.fetch();
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
