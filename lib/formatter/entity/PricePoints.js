'use strict';

const rootPrefix = '../../..',
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
   *
   *
   */
  perform() {
    const oThis = this,
      formattedPricePointsData = {};

    if (!oThis.params.hasOwnProperty('OST')) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_f_e_pp_1',
          api_error_identifier: 'entity_formatting_failed',
          debug_options: { pricePointsParams: oThis.params }
        })
      );
    }

    formattedPricePointsData['OST'] = '1';
    formattedPricePointsData['USD'] = oThis.params.OST.USD;
    formattedPricePointsData['updated_timestamp'] = oThis.params.OST['updated_timestamp'];

    return responseHelper.successWithData(formattedPricePointsData);
  }
}

module.exports = PricePointsFormatter;
