/**
 * Formatter for salt entity to convert keys to snake case.
 *
 * @module lib/formatter/entity/UserSalt
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
   * @param {String} params.salt
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

    let formattedUserSaltData = {};

    formattedUserSaltData.scrypt_salt = oThis.params.salt;
    formattedUserSaltData.updated_timestamp = Number(oThis.params.updatedTimestamp);

    return responseHelper.successWithData(formattedUserSaltData);
  }
}

module.exports = SaltFormatter;
