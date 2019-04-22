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

    if (
      !oThis.params.hasOwnProperty(conversionRatesConstants.OST) ||
      !oThis.params.hasOwnProperty(conversionRatesConstants.USDC) ||
      !oThis.params.OST.hasOwnProperty(conversionRatesConstants.USD) ||
      !oThis.params.USDC.hasOwnProperty(conversionRatesConstants.USD) ||
      !oThis.params.OST.hasOwnProperty('updated_timestamp') ||
      !oThis.params.USDC.hasOwnProperty('updated_timestamp')
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_f_e_pp_1',
          api_error_identifier: 'entity_formatting_failed',
          debug_options: { pricePointsParams: oThis.params }
        })
      );
    }

    ostPricePointsData['USD'] = parseFloat(oThis.params.OST[conversionRatesConstants.USD]);
    ostPricePointsData['decimals'] = Number(oThis.params.decimals);
    ostPricePointsData['updated_timestamp'] = Number(oThis.params.OST['updated_timestamp']);

    usdcPricePointsData['USD'] = parseFloat(oThis.params.USDC[conversionRatesConstants.USD]);
    usdcPricePointsData['decimals'] = Number(oThis.params.decimals);
    usdcPricePointsData['updated_timestamp'] = Number(oThis.params.USDC['updated_timestamp']);

    formattedPricePointsData['OST'] = ostPricePointsData;
    formattedPricePointsData['USDC'] = usdcPricePointsData;

    return responseHelper.successWithData(formattedPricePointsData);
  }
}

module.exports = PricePointsFormatter;
