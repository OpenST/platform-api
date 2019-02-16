/**
 * Formatter for user entity to convert keys to snake case.
 *
 * @module lib/formatter/entity/User
 */

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser');

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
   * @param {String} params.tokenHolderAddress
   * @param {String} params.multisigAddress
   * @param {String} params.recoveryOwnerAddress
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

    let formattedUserData = {};

    formattedUserData.id = oThis.params.userId;
    formattedUserData.token_id = Number(oThis.params.tokenId);
    formattedUserData.token_holder_address = oThis.params.tokenHolderAddress || null;
    formattedUserData.device_manager_address = oThis.params.multisigAddress || null;
    formattedUserData.recovery_owner_address = oThis.params.recoveryOwnerAddress || null;
    formattedUserData.type = oThis.params.kind;
    formattedUserData.status = oThis.params.status;
    formattedUserData.updated_timestamp = Number(oThis.params.updatedTimestamp);

    return responseHelper.successWithData(formattedUserData);
  }
}

module.exports = UserFormatter;
