const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class for salt formatter.
 *
 * @class SaltFormatter
 */
class SaltFormatter {
  /**
   * Constructor for salt formatter.
   *
   * @param {object} params
   * @param {string} params.salt
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
   * @returns {{}}
   */
  perform() {
    const oThis = this;

    const formattedUserSaltData = {};

    formattedUserSaltData.scrypt_salt = oThis.params.salt;
    formattedUserSaltData.updated_timestamp = Number(oThis.params.updatedTimestamp);

    return responseHelper.successWithData(formattedUserSaltData);
  }
}

module.exports = SaltFormatter;
