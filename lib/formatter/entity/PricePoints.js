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
      ostPricePointsData = {},
      usdcPricePointsData = {};

    if (oThis.params.hasOwnProperty(conversionRatesConstants.OST)) {
      if (
        !oThis.params[conversionRatesConstants.OST].hasOwnProperty(conversionRatesConstants.USD) ||
        !oThis.params[conversionRatesConstants.OST].hasOwnProperty('updated_timestamp')
      ) {
        return oThis._returnError();
      }

      ostPricePointsData[conversionRatesConstants.USD] = parseFloat(
        oThis.params[conversionRatesConstants.OST][conversionRatesConstants.USD]
      );
      ostPricePointsData['decimals'] = Number(oThis.params.decimals);
      ostPricePointsData['updated_timestamp'] = Number(oThis.params[conversionRatesConstants.OST]['updated_timestamp']);

      formattedPricePointsData[conversionRatesConstants.OST] = ostPricePointsData;
    } else if (oThis.params.hasOwnProperty(conversionRatesConstants.USDC)) {
      if (
        !oThis.params[conversionRatesConstants.USDC].hasOwnProperty(conversionRatesConstants.USD) ||
        !oThis.params[conversionRatesConstants.USDC].hasOwnProperty('updated_timestamp')
      ) {
        return oThis._returnError();
      }
      usdcPricePointsData[conversionRatesConstants.USD] = parseFloat(
        oThis.params[conversionRatesConstants.USDC][conversionRatesConstants.USD]
      );
      usdcPricePointsData['decimals'] = Number(oThis.params.decimals);
      usdcPricePointsData['updated_timestamp'] = Number(
        oThis.params[conversionRatesConstants.USDC]['updated_timestamp']
      );

      formattedPricePointsData[conversionRatesConstants.USDC] = usdcPricePointsData;
    } else {
      return oThis._returnError();
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
