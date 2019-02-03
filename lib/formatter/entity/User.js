/*
 * Formatter for user entity to convert keys to snake case
 */

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser');

class UserFormatter {
  /**
   * @constructor
   */
  constructor(params) {
    const oThis = this;
    oThis.params = params;
  }

  /**
   * perform
   *
   * @return {{}}
   */
  perform() {
    const oThis = this;

    let formattedUserData = {};

    formattedUserData.userId = oThis.params.userId;
    formattedUserData.token_id = oThis.params.tokenId;
    formattedUserData.token_holder_address = oThis.params.tokenHolderAddress;
    formattedUserData.device_manager_address = oThis.params.multisigAddress;
    formattedUserData.type = tokenUserConstants.kinds[oThis.params.kind];
    formattedUserData.status = tokenUserConstants.statuses[oThis.params.status];
    formattedUserData.updated_timestamp = oThis.params.updateTimestamp;

    return responseHelper.successWithData(formattedUserData);
  }
}

module.exports = UserFormatter;
