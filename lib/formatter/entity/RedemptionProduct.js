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
   * @param {Object} params
   * @param {String} params.id
   * @param {String} params.name
   * @param {String} params.description
   * @param {Object} params.images
   * @param {String} params.status
   * @param {Number} params.updatedTimestamp
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
      image: oThis.params.image,
      status: oThis.params.status,
      updated_timestamp: Number(oThis.params.uts)
    };

    return responseHelper.successWithData(formattedRedemptionProductData);
  }
}

module.exports = RedemptionProductFormatter;
