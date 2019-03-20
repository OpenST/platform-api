//Used for polling for authorize and revoke device.

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response');

class GetDevice {
  constructor(params) {
    const oThis = this;

    oThis.userUuid = params.userUuid;
    oThis.deviceAddress = params.deviceAddress;
    oThis.ostObj = params.ostObj;
  }

  async perform() {
    let oThis = this,
      deviceService = oThis.ostObj.services.devices,
      deviceData = await deviceService
        .get({ user_id: oThis.userUuid, device_address: oThis.deviceAddress })
        .catch(function(err) {
          console.log(JSON.stringify(err));
        });

    if (deviceData['success']) {
      return responseHelper.successWithData(deviceData.data);
    } else {
      console.log('Error in api call', deviceData);
      return responseHelper.error({
        internal_error_identifier: 't_s_uf_gd_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: { API: 'GetDevice' }
      });
    }
  }
}

module.exports = GetDevice;
