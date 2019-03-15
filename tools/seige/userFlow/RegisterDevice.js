//IP uuid, device address, api signer address.
//This class will register the user
//OP:

const rootPrefix = '../../..';

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
        });

    return deviceData;
  }
}

module.exports = RegisterDevice;
