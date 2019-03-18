//user setup
//IP: uuid: device address, session address, and respective keys,

const rootPrefix = '../../..',
  RequestKlass = require(rootPrefix + '/tools/seige/personalKeySigner');

const uuidV4 = require('uuid/v4');

class ActivateUser {
  constructor(params) {
    const oThis = this;

    oThis.tokenId = params.tokenId;
    oThis.userUuid = params.userUuid;
    oThis.deviceAddress = params.deviceAddress;
    oThis.apiSignerPrivateKey = params.apiSignerPrivateKey;
    oThis.sessionAddress = params.sessionAddress;
    oThis.recoveryOwnerAddress = params.deviceAddress;
    oThis.expirationHeight = params.expirationHeight;
    oThis.spendingLimit = params.spendingLimit;
    oThis.apiSignerAddress = params.deviceAddress;
    oThis.apiEndPoint = params.apiEndPoint;
  }

  async perform() {
    let oThis = this,
      requestObj = new RequestKlass({
        tokenId: oThis.tokenId,
        walletAddress: oThis.deviceAddress,
        apiSignerAddress: oThis.apiSignerAddress,
        apiSignerPrivateKey: oThis.apiSignerPrivateKey,
        apiEndpoint: oThis.apiEndPoint,
        userUuid: oThis.userUuid
      }),
      queryParams = {
        user_id: oThis.userUuid,
        device_address: oThis.deviceAddress,
        session_addresses: [oThis.sessionAddress],
        recovery_owner_address: oThis.recoveryOwnerAddress,
        expiration_height: oThis.expirationHeight,
        spending_limit: oThis.spendingLimit
      },
      resource = `/users/${oThis.userUuid}/activate-user`,
      beforeTimeStamp = Date.now(),
      response = await requestObj.post(resource, queryParams).catch(function(err) {
        console.log(JSON.stringify(err));
      }),
      afterTimeStamp = Date.now();

    console.log('Time taken for activate user: ', afterTimeStamp - beforeTimeStamp, 'ms');

    return response;
  }
}

module.exports = ActivateUser;
