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
   * @param {String/Number} params.tokenId
   * @param {String} params.tokenHolderAddress
   * @param {String} params.multisigAddress
   * @param {Number} params.kind
   * @param {Number} params.status
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

    formattedUserData.id = oThis.params.userId;
    formattedUserData.token_id = oThis.params.tokenId;
    formattedUserData.token_holder_address = oThis.params.tokenHolderAddress;
    formattedUserData.device_manager_address = oThis.params.multisigAddress;
    formattedUserData.recovery_owner_address = oThis.params.recoveryOwnerAddress;
    formattedUserData.type = tokenUserConstants.kinds[oThis.params.kind];
    formattedUserData.status = tokenUserConstants.statuses[oThis.params.status];
    formattedUserData.updated_timestamp = oThis.params.updatedTimestamp;

    return responseHelper.successWithData(formattedUserData);
  }
}

module.exports = UserFormatter;
