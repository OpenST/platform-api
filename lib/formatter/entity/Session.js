'use strict';
/**
 * Formatter for Session entity.
 *
 * @module lib/formatter/entity/Session
 */
const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 *
 * @class SessionFormatter
 */
class SessionFormatter {
  /**
   * @constructor
   *
   * @param {String} params.userId
   * @param {String} params.address
   * @param {Number} params.expirationHeight
   * @param {Number} [params.expirationTimestamp]
   * @param {Number} params.spendingLimit
   * @param {String} params.status
   * @param {Number} params.updatedTimestamp
   */
  constructor(params) {
    const oThis = this;
    oThis.params = params;
  }

  /**
   * Main performer method for the class.
   *
   */
  perform() {
    const oThis = this,
      formattedDeviceData = {};

    if (
      !oThis.params.hasOwnProperty('userId') ||
      !oThis.params.hasOwnProperty('address') ||
      !oThis.params.hasOwnProperty('expirationHeight') ||
      !oThis.params.hasOwnProperty('spendingLimit') ||
      !oThis.params.hasOwnProperty('status') ||
      !oThis.params.hasOwnProperty('updatedTimestamp')
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_f_e_s_1',
          api_error_identifier: 'entity_formatting_failed',
          debug_options: { sessionParams: oThis.params }
        })
      );
    }

    formattedDeviceData['user_id'] = oThis.params.userId;
    formattedDeviceData['address'] = oThis.params.address;
    formattedDeviceData['expiration_height'] = oThis.params.expirationHeight;
    formattedDeviceData['approx_expiration_timestamp'] = oThis.params.expirationTimestamp || '';
    formattedDeviceData['spending_limit'] = oThis.params.spendingLimit;
    formattedDeviceData['nonce'] = '0'; // TODO: Will be exact value after token holder setup is done
    formattedDeviceData['status'] = oThis.params.status;
    formattedDeviceData['updated_timestamp'] = oThis.params.updatedTimestamp;

    return responseHelper.successWithData(formattedDeviceData);
  }
}

module.exports = SessionFormatter;
