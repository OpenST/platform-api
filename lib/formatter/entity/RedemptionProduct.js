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
    const oThis = this;

    const formattedRedemptionProductData = {
      id: oThis.params.id,
      name: oThis.params.name,
      images: oThis.params.images,
      description: { text: oThis.params.description },
      status: oThis.params.status,
      updated_timestamp: Number(oThis.params.uts)
    };

    return responseHelper.successWithData(formattedRedemptionProductData);
  }
}

module.exports = RedemptionProductFormatter;
