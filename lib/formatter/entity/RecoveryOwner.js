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
   * @param {number} params.userId
   * @param {string} params.address
   * @param {number} params.status
   * @param {number} params.updatedTimestamp
   *
   * @sets oThis.params
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.params = params;
  }

  /**
   * Main performer for the class.
   *
   * @returns {Promise<never>|*|result}
   */
  perform() {
    const oThis = this;

    const formattedRecoveryOwnerData = {};

    if (
      !oThis.params.hasOwnProperty('userId') ||
      !oThis.params.hasOwnProperty('address') ||
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

    formattedRecoveryOwnerData.user_id = oThis.params.userId;
    formattedRecoveryOwnerData.address = oThis.params.address;
    formattedRecoveryOwnerData.status = oThis.params.status;
    formattedRecoveryOwnerData.updated_timestamp = Number(oThis.params.updatedTimestamp);

    return responseHelper.successWithData(formattedRecoveryOwnerData);
  }
}

module.exports = RecoveryOwnerFormatter;
