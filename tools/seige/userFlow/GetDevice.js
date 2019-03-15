//Used for polling for authorize and revoke device.

const rootPrefix = '../../..';

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

    return deviceData.data;
  }
}

module.exports = GetDevice;
