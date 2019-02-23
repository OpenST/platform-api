'use strict';

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response');

class DeviceManager {
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

    let nonce = null,
      requirement = null;
    if (oThis.params.hasOwnProperty('nonce')) {
      nonce = Number(oThis.params.nonce);
    }
    if (oThis.params.hasOwnProperty('requirement')) {
      requirement = Number(oThis.params.requirement);
    }
    formattedDeviceManagersData['user_id'] = oThis.params.userId;
    formattedDeviceManagersData['address'] = oThis.params.multisigAddress || ''; // multi-sig address
    formattedDeviceManagersData['requirement'] = requirement; // from contract
    formattedDeviceManagersData['nonce'] = nonce; // from contract
    formattedDeviceManagersData['status'] = oThis.params.status;
    formattedDeviceManagersData['updated_timestamp'] = Number(oThis.params.updatedTimestamp);

    return responseHelper.successWithData(formattedDeviceManagersData);
  }
}

module.exports = DeviceManager;
