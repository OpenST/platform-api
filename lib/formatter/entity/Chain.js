/**
 * Formatter for chain entity to convert keys to snake case.
 *
 * @module lib/formatter/entity/Chain
 */
const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class for chain formatter.
 *
 * @class
 */
class ChainFormatter {
  /**
   * Constructor for chain formatter.
   *
   * @param {Object} params
   * @param {String/Number} params.id
   * @param {String} params.blockHeight
   * @param {String} params.updatedTimestamp
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

    let formattedUserData = {};

    formattedUserData.id = oThis.params.id;
    formattedUserData.block_height = oThis.params.blockHeight;
    formattedUserData.updated_timestamp = oThis.params.updatedTimestamp;

    return responseHelper.successWithData(formattedUserData);
  }
}

module.exports = ChainFormatter;
