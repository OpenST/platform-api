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
class UserFormatter {
  /**
   * Constructor for user formatter.
   *
   * @param {Object} params
   * @param {String} params.userId
   * @param {Number} params.tokenId
   * @param {String} [params.tokenHolderAddress]
   * @param {String} [params.multisigAddress]
   * @param {String} [params.recoveryAddress]
   * @param {String} [params.recoveryOwnerAddress]
   * @param {String} params.kind
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

    const formattedUserData = {
      id: oThis.params.userId,
      token_id: Number(oThis.params.tokenId),
      token_holder_address: oThis.params.tokenHolderAddress || null,
      device_manager_address: oThis.params.multisigAddress || null,
      recovery_address: oThis.params.recoveryAddress || null,
      recovery_owner_address: oThis.params.recoveryOwnerAddress || null,
      type: oThis.params.kind,
      status: oThis.params.status,
      updated_timestamp: Number(oThis.params.updatedTimestamp)
    };

    return responseHelper.successWithData(formattedUserData);
  }
}

module.exports = UserFormatter;
