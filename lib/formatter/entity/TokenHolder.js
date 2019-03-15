/**
 * Formatter for token holder entity to convert keys to snake case.
 *
 * @module lib/formatter/entity/TokenHolder
 */

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class for token holder formatter.
 *
 * @class
 */
class TokenHolderFormatter {
  /**
   * Constructor for token holder formatter.
   *
   * @param {Object} params
   * @param {String} params.userId
   * @param {String} [params.tokenHolderAddress]
   * @param {String} [params.tokenHolderStatus]
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

    // If token holder address is present then token holder status would be given
    let thStatus = null;
    if (oThis.params.tokenHolderAddress) {
      thStatus = oThis.params.tokenHolderStatus;
    }

    const formattedData = {
      user_id: oThis.params.userId,
      address: oThis.params.tokenHolderAddress || null,
      status: thStatus,
      updated_timestamp: Number(oThis.params.updatedTimestamp)
    };

    return responseHelper.successWithData(formattedData);
  }
}

module.exports = TokenHolderFormatter;
