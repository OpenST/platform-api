/*
 * Formatter for user entity to convert keys to snake case
 */

const rootPrefix = '../../..',
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser');

class UserFormatter {
  /**
   * @constructor
   */
  constructor() {}

  /**
   * perform
   *
   * @param userData
   * @return {{}}
   */
  perform(userData) {
    let formattedUserData = {};

    formattedUserData.userId = userData.userId;
    formattedUserData.token_id = userData.tokenId;
    formattedUserData.token_holder_address = userData.tokenHolderAddress;
    formattedUserData.device_manager_address = userData.multisigAddress;
    formattedUserData.type = tokenUserConstants.kinds[userData.kind];
    formattedUserData.status = tokenUserConstants.statuses[userData.status];
    formattedUserData.updated_timestamp = userData.updateTimestamp;

    return formattedUserData;
  }
}

module.exports = new UserFormatter();
