/**
 * Formatter for salt entity to convert keys to snake case.
 *
 * @module lib/formatter/entity/Salt
 */

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class for salt formatter.
 *
 * @class
 */
class SaltFormatter {
  /**
   * Constructor for salt formatter.
   *
   * @param {Object} params
   * @param {String} params.scryptSalt
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

    formattedUserData.scrypt_salt = oThis.params.scryptSalt;
    formattedUserData.updated_timestamp = oThis.params.updatedTimestamp;

    return responseHelper.successWithData(formattedUserData);
  }
}

module.exports = SaltFormatter;
