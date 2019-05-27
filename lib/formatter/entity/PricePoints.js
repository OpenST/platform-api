'use strict';

const rootPrefix = '../../..',
  conversionRatesConstants = require(rootPrefix + '/lib/globalConstant/conversionRates'),
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
  perform() {
    const oThis = this,
      formattedPricePointsData = {},
      pricePointData = {};

    let pricePointEntityData = oThis.params;

    for (let symbol in pricePointEntityData) {
      if (symbol == 'decimals') continue; // Skipping non-symbol key

      let pricePointEntity = pricePointEntityData[symbol];

      if (
        !pricePointEntity.hasOwnProperty(conversionRatesConstants.USD) ||
        !pricePointEntity.hasOwnProperty('updated_timestamp')
      ) {
        return oThis._returnError();
      }

      pricePointData[conversionRatesConstants.USD] = parseFloat(pricePointEntity[conversionRatesConstants.USD]);

      pricePointData['decimals'] = Number(pricePointEntityData.decimals);
      pricePointData['updated_timestamp'] = Number(pricePointEntity['updated_timestamp']);

      formattedPricePointsData[symbol] = pricePointData;
    }

    return responseHelper.successWithData(formattedPricePointsData);
  }

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
