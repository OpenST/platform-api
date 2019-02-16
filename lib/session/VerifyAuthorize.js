'use strict';

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  GetTxEvent = require(rootPrefix + '/lib/transactions/GetTxEvent'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  sessionConstants = require(rootPrefix + '/lib/globalConstant/session'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

require(rootPrefix + '/lib/transactions/GetTxEvent');
require(rootPrefix + '/lib/device/UpdateStatus');
require(rootPrefix + '/app/models/ddb/sharded/Session');

class VerifyAuthorizeSession {
  constructor(params) {
    const oThis = this;

    oThis.sessionKey = params.sessionKey;
    oThis.transactionHash = params.transactionHash;
    oThis.chainId = params.chainId;
    oThis.userId = params.userId;
    oThis.sessionShardNumber = params.sessionShardNumber;
  }

  async perform() {
    const oThis = this;

    let eventsData = await oThis._fetchEventsData();

    if (eventsData.isFailure()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskFailed
        })
      );
    }

    let checkResponse = await oThis._checkEventsData(eventsData.data);

    if (checkResponse.isFailure()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskFailed
        })
      );
    }

    await oThis._markAuthorizedInDevicesTable();

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone
      })
    );
  }

  async _fetchEventsData() {
    const oThis = this;
    let paramsForGetTxEvent = {
      chainId: oThis.chainId,
      transactionHash: oThis.transactionHash,
      contractNames: ['GnosisSafe', 'TokenHolder'],
      eventNamesMap: { SessionAuthorized: 1 }
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
      return responseHelper.error({
        internal_error_identifier: 'l_d_va_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: {}
      });
    }

    return eventsRsp;
  }

  async _checkEventsData(eventsData) {
    const oThis = this;

    if (!eventsData.hasOwnProperty('SessionAuthorized')) {
      logger.error('SessionAuthorized event not found.');
      return responseHelper.error({
        internal_error_identifier: 'l_d_va_2',
        api_error_identifier: 'something_went_wrong',
        debug_options: {}
      });
    }

    return responseHelper.successWithData({});
  }

  async _markAuthorizedInDevicesTable() {
    const oThis = this;

    let paramsForSessionsUpdate = {
      userId: oThis.userId,
      address: oThis.sessionKey,
      status: sessionConstants.authorizedStatus,
      updatedTimestamp: Math.floor(new Date().getTime() / 1000)
    };

    let SessionModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionModel'),
      sessionModelObj = new SessionModel({ shardNumber: oThis.sessionShardNumber }),
      updateRsp = await sessionModelObj.updateSessionStatus(paramsForSessionsUpdate);

    return updateRsp;
  }
}

InstanceComposer.registerAsShadowableClass(
  VerifyAuthorizeSession,
  coreConstants.icNameSpace,
  'VerifyAuthorizeSessionTransaction'
);
module.exports = VerifyAuthorizeSession;
