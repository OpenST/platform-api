'use strict';

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  GetTxEvent = require(rootPrefix + '/lib/transactions/GetTxEvent'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

class RollbackAuthorizeDevice {
  constructor(params) {
    const oThis = this;
    oThis.deviceAddress = params.deviceAddress;
    oThis.transactionHash = params.transactionHash;
    oThis.auxChainId = params.auxChainId;
    oThis.userId = params.userId;
    oThis.devicesShardNumber = params.devicesShardNumber;
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
      status: deviceConstants.registeredStatus,
      shardNumber: oThis.devicesShardNumber,
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
