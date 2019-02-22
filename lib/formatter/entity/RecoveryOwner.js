'use strict';
/**
 * Formatter for Recovery owner entity.
 *
 * @module lib/formatter/entity/RecoveryOwner
 */
const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class for recovery owner formatter.
 *
 * @class RecoveryOwnerFormatter
 */
class RecoveryOwnerFormatter {
  /**
   * Constructor for recovery owner formatter.
   *
   * @param {Integer} params.userId
   * @param {String} params.recoveryOwnerAddress
   * @param {Number} params.status
   * @param {Number} params.updatedTimestamp
   *
   * @set oThis.params
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.params = params;
  }

  /**
   * Main performer method for the class.
   */
  perform() {
    const oThis = this,
      formattedRecoveryOwnerData = {};

    if (
      !oThis.params.hasOwnProperty('userId') ||
      !oThis.params.hasOwnProperty('recoveryOwnerAddress') ||
      !oThis.params.hasOwnProperty('status') ||
      !oThis.params.hasOwnProperty('updatedTimestamp')
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_f_e_ro_1',
          api_error_identifier: 'entity_formatting_failed',
          debug_options: { deviceParams: oThis.params }
        })
      );
    }

    formattedRecoveryOwnerData['user_id'] = oThis.params.userId;
    formattedRecoveryOwnerData['address'] = oThis.params.recoveryOwnerAddress;
    formattedRecoveryOwnerData['status'] = oThis.params.status;
    formattedRecoveryOwnerData['updated_timestamp'] = Number(oThis.params.updatedTimestamp);

    return responseHelper.successWithData(formattedRecoveryOwnerData);
  }
}

module.exports = RecoveryOwnerFormatter;
