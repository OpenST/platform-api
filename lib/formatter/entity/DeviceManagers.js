'use strict';

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device');

class DeviceManagers {
  /**
   *
   *
   * @param params
   */
  constructor(params) {
    const oThis = this;

    oThis.params = params;
  }

  /**
   *
   *
   */
  perform() {
    const oThis = this,
      formattedDeviceManagersData = {};

    if (
      !oThis.params.hasOwnProperty('userId') ||
      !oThis.params.hasOwnProperty('address') ||
      !oThis.params.hasOwnProperty('requirement') ||
      !oThis.params.hasOwnProperty('nonce') ||
      !oThis.params.hasOwnProperty('status') ||
      !oThis.params.hasOwnProperty('updatedTimestamp')
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_f_e_dm_1',
          api_error_identifier: 'entity_formatting_failed',
          debug_options: { deviceManagersParams: oThis.params }
        })
      );
    }

    formattedDeviceManagersData['user_id'] = oThis.params.userId;
    formattedDeviceManagersData['address'] = oThis.params.address;
    formattedDeviceManagersData['requirement'] = oThis.params.requirement || 1; // from contract
    formattedDeviceManagersData['nonce'] = oThis.params.nonce || 0; // from contract
    formattedDeviceManagersData['status'] = deviceConstants.kinds[oThis.params.status];
    formattedDeviceManagersData['updated_timestamp'] = oThis.params.updatedTimestamp;

    return Promise.resolve(responseHelper.successWithData(formattedDeviceManagersData));
  }
}

module.exports = DeviceManagers;
