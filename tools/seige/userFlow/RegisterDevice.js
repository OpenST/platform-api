//IP uuid, device address, api signer address.
//This class will register the user
//OP:

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response');

const uuidV4 = require('uuid/v4');

class RegisterDevice {
  constructor(params) {
    const oThis = this;

    oThis.userUuid = params.userUuid;
    oThis.deviceAddress = params.deviceAddress;
    oThis.apiSignerAddress = params.deviceAddress;
    oThis.deviceUuid = uuidV4();
    oThis.deviceName = 'Iphone 9';

    oThis.ostObj = params.ostObj;
  }

  async perform() {
    let oThis = this,
      deviceService = oThis.ostObj.services.devices,
      beforeTimeStamp = Date.now(),
      deviceData = await deviceService
        .create({
          user_id: oThis.userUuid,
          address: oThis.deviceAddress,
          api_signer_address: oThis.apiSignerAddress,
          device_uuid: oThis.deviceUuid,
          device_name: oThis.deviceName
        })
        .catch(function(err) {
          console.log(JSON.stringify(err));
        }),
      afterTimeStamp = Date.now();

    console.log('Time taken for register device: ', afterTimeStamp - beforeTimeStamp, 'ms');

    if (deviceData['success']) {
      return responseHelper.successWithData(deviceData.data);
    } else {
      console.log('Error in api call', deviceData);
      return responseHelper.error({
        internal_error_identifier: 't_s_uf_rd_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: { API: 'RegisterDevice' }
      });
    }
  }
}

module.exports = RegisterDevice;
