const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class for redemption product extended formatter.
 *
 * @class RedemptionProductExtendedFormatter
 */
class RedemptionProductExtendedFormatter {
  /**
   * Constructor for redemption product extended formatter.
   *
   * @param {object} params
   * @param {string} params.id
   * @param {string} params.name
   * @param {string} params.description
   * @param {object} params.images
   * @param {string} params.status
   * @param {number} params.updatedTimestamp
   * @param {array<object>} params.availability
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

    const formattedData = {
      id: oThis.params.id,
      name: oThis.params.name,
      images: oThis.params.images,
      description: oThis.params.description,
      status: oThis.params.status,
      updated_timestamp: Number(oThis.params.uts),
      availability: oThis.params.availability
    };

    return responseHelper.successWithData(formattedData);
  }
}

module.exports = RedemptionProductExtendedFormatter;
