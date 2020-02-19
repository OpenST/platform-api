/**
 * Formatter for user entity to convert keys to snake case.
 *
 * @module lib/formatter/entity/User
 */

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class for user formatter.
 *
 * @class
 */
class RedemptionProductFormatter {
  /**
   * Constructor for user formatter.
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
   * Perform
   *
   * @return {{}}
   */
  perform() {
    const oThis = this;

    console.log('oThis.params-------', oThis.params);

    const formattedRedemptionProductData = {
      id: oThis.params.id,
      name: oThis.params.name,
      images: oThis.params.images,
      description: oThis.params.description,
      status: oThis.params.status,
      updated_timestamp: Number(oThis.params.uts)
    };

    return responseHelper.successWithData(formattedRedemptionProductData);
  }
}

module.exports = RedemptionProductFormatter;
