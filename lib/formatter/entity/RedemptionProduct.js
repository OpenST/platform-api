const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class for redemption product formatter.
 *
 * @class RedemptionProductFormatter
 */
class RedemptionProductFormatter {
  /**
   * Constructor for redemption product formatter.
   *
   * @param {object} params
   * @param {string} params.id
   * @param {string} params.name
   * @param {string} params.description
   * @param {object} params.images
   * @param {string} params.status
   * @param {number} params.updatedTimestamp
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
   * @returns {*|result}
   */
  perform() {
    const oThis = this,
      formattedRedemptionProductData = {};

    if (
      !oThis.params.hasOwnProperty('id') ||
      !oThis.params.hasOwnProperty('name') ||
      !oThis.params.hasOwnProperty('status') ||
      !oThis.params.hasOwnProperty('uts')
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_f_e_rd_1',
          api_error_identifier: 'entity_formatting_failed',
          debug_options: { redemptionProductParams: oThis.params }
        })
      );
    }

    let images = null,
      description = null;

    if (oThis.params.hasOwnProperty('images')) {
      images = oThis.params.images;
    }

    if (oThis.params.hasOwnProperty('description')) {
      description = oThis.params.description;
    }

    formattedRedemptionProductData['id'] = oThis.params.id;
    formattedRedemptionProductData['name'] = oThis.params.name;
    formattedRedemptionProductData['images'] = images;
    formattedRedemptionProductData['description'] = { text: description };
    formattedRedemptionProductData['status'] = oThis.params.status;
    formattedRedemptionProductData['updated_timestamp'] = Number(oThis.params.uts);

    return responseHelper.successWithData(formattedRedemptionProductData);
  }
}

module.exports = RedemptionProductFormatter;
