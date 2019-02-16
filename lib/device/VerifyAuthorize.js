'use strict';

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  GetTxEvent = require(rootPrefix + '/lib/transactions/GetTxEvent'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

require(rootPrefix + '/lib/transactions/GetTxEvent');
require(rootPrefix + '/lib/device/UpdateStatus');

class VerifyAuthorize {
  constructor(params) {
    const oThis = this;
    oThis.deviceAddress = params.deviceAddress;
    oThis.transactionHash = params.transactionHash;
    oThis.chainId = params.chainId;
    oThis.userId = params.userId;
    oThis.devicesShardNumber = params.devicesShardNumber;
  }

  async perform() {
    const oThis = this;

    let eventsData = await oThis._fetchContractEventsData();

    await oThis._checkEventsData(eventsData);

    await oThis._markAuthorizedInDevicesTable();

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone
      })
    );
  }

  async _fetchContractEventsData() {
    const oThis = this;
    let paramsForGetTxEvent = {
      chainId: oThis.chainId,
      transactionHash: oThis.transactionHash,
      contractNames: ['GnosisSafe'],
      eventNamesMap: { AddedOwner: 1 }
    };
    let GetTxEvent = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'GetTxEvent'),
      getTxEventObj = new GetTxEvent(paramsForGetTxEvent),
      eventsRsp = await getTxEventObj.perform();

    if (eventsRsp.isFailure()) {
      logger.error('Error in reading events');
      return eventsRsp;
    }

    let eventsData = eventsRsp.data;

    if (basicHelper.isEmptyObject(eventsData)) {
      logger.error('Events data is empty');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_d_va_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return eventsData;
  }

  async _checkEventsData(eventsData) {
    const oThis = this;

    if (!eventsData.hasOwnProperty('AddedOwner')) {
      logger.error('Transaction not successful');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_d_va_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }
  }

  async _markAuthorizedInDevicesTable() {
    const oThis = this;

    let paramsToUpdateDeviceStatus = {
      chainId: oThis.chainId,
      userId: oThis.userId,
      status: deviceConstants.authorisedStatus,
      shardNumber: oThis.devicesShardNumber,
      walletAddress: oThis.deviceAddress
    };
    let UpdateDeviceStatusKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UpdateDeviceStatus'),
      updateDeviceStatusObj = new UpdateDeviceStatusKlass(paramsToUpdateDeviceStatus);

    return updateDeviceStatusObj.perform();
  }
}

InstanceComposer.registerAsShadowableClass(
  VerifyAuthorize,
  coreConstants.icNameSpace,
  'VerifyAuthorizeDeviceTransaction'
);
module.exports = VerifyAuthorize;
