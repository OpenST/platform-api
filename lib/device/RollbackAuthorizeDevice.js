'use strict';
/**
 * This class file rollbacks all the changes done before performing authorize device transaction.
 *
 * @module lib/device/RollbackAuthorizeDevice
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

require(rootPrefix + '/lib/device/UpdateStatus');

/**
 * Class for RollbackAuthorizeDevice.
 *
 * @class
 */
class RollbackAuthorizeDevice {
  constructor(params) {
    const oThis = this;
    oThis.deviceAddress = params.deviceAddress;
    oThis.transactionHash = params.transactionHash;
    oThis.auxChainId = params.auxChainId;
    oThis.userId = params.userId;
    oThis.deviceShardNumber = params.deviceShardNumber;
  }

  async perform() {
    const oThis = this;

    await oThis.updateDeviceStatus();

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone
      })
    );
  }

  async updateDeviceStatus() {
    const oThis = this;

    let paramsToUpdateDeviceStatus = {
      chainId: oThis.auxChainId,
      userId: oThis.userId,
      initialStatus: deviceConstants.authorizingStatus,
      finalStatus: deviceConstants.registeredStatus,
      shardNumber: oThis.deviceShardNumber,
      walletAddress: oThis.deviceAddress
    };
    let UpdateDeviceStatusKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UpdateDeviceStatus'),
      updateDeviceStatusObj = new UpdateDeviceStatusKlass(paramsToUpdateDeviceStatus),
      updateDeviceStatusRsp = await updateDeviceStatusObj.perform();

    if (updateDeviceStatusRsp.isFailure()) {
      return Promise.reject(updateDeviceStatusRsp);
    }

    return Promise.resolve(responseHelper.successWithData({}));
  }
}

InstanceComposer.registerAsShadowableClass(
  RollbackAuthorizeDevice,
  coreConstants.icNameSpace,
  'RollbackAuthorizeDevice'
);
module.exports = RollbackAuthorizeDevice;
