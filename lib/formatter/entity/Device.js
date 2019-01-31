'use strict';
/**
 * Formatter for Device entity.
 *
 * @module lib/formatter/entity/Device.js
 */
const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  DeviceConstant = require(rootPrefix + '/lib/globalConstant/device');

/**
 *
 * @class DeviceFormatter
 */
class DeviceFormatter {
  /**
   * @constructor
   *
   * @param {Integer} params.userId
   * @param {String} params.walletAddress
   * @param {String} params.personalSignAddress
   * @param {String} params.deviceName
   * @param {String} params.deviceUuid
   * @param {Number} params.status
   * @param {Number} params.updateTimestamp
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
      !oThis.params.hasOwnProperty('walletAddress') ||
      !oThis.params.hasOwnProperty('personalSignAddress') ||
      !oThis.params.hasOwnProperty('deviceName') ||
      !oThis.params.hasOwnProperty('deviceUuid') ||
      !oThis.params.hasOwnProperty('status') ||
      !oThis.params.hasOwnProperty('updateTimestamp')
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_f_e_d_1',
          api_error_identifier: 'entity_formatting_failed',
          debug_options: { deviceParams: oThis.params }
        })
      );
    }

    formattedDeviceData['user_id'] = oThis.params.userId;
    formattedDeviceData['address'] = oThis.params.walletAddress;
    formattedDeviceData['personal_sign_address'] = oThis.params.personalSignAddress;
    formattedDeviceData['device_name'] = oThis.params.deviceName;
    formattedDeviceData['device_uuid'] = oThis.params.deviceUuid;
    formattedDeviceData['status'] = DeviceConstant.kinds[oThis.params.status];
    formattedDeviceData['updated_timestamp'] = oThis.params.updateTimestamp;

    return formattedDeviceData;
  }
}

module.exports = DeviceFormatter;
