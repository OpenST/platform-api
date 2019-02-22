'use strict';
/**
 * This class file verifies if the authorize session was done successfully.
 *
 * @module lib/session/VerifyAuthorize
 */

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

  /**
   * perform
   *
   * @returns {Promise<any>}
   */
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

    await oThis._markAuthorizedInSessionsTable();

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone
      })
    );
  }

  /**
   * This function fetches events data.
   *
   * @returns {Promise<*>}
   * @private
   */
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
        internal_error_identifier: 'l_s_va_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: {}
      });
    }

    return eventsRsp;
  }

  /**
   * This function checks if 'AddedOwner' event is present in events data passed.
   *
   * @param eventsData
   * @returns {Promise<*>}
   * @private
   */
  async _checkEventsData(eventsData) {
    const oThis = this;

    if (!eventsData.hasOwnProperty('SessionAuthorized')) {
      logger.error('SessionAuthorized event not found.');
      return responseHelper.error({
        internal_error_identifier: 'l_s_va_2',
        api_error_identifier: 'something_went_wrong',
        debug_options: {}
      });
    }

    return responseHelper.successWithData({});
  }

  /**
   * Marks session authorized in sessions table.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _markAuthorizedInSessionsTable() {
    const oThis = this;

    let SessionModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionModel'),
      sessionModelObj = new SessionModel({ shardNumber: oThis.sessionShardNumber }),
      updateRsp = await sessionModelObj.updateStatusFromInitialToFinal(
        oThis.userId,
        oThis.sessionKey,
        sessionConstants.initializingStatus,
        sessionConstants.authorizedStatus
      );

    return updateRsp;
  }
}

InstanceComposer.registerAsShadowableClass(
  VerifyAuthorizeSession,
  coreConstants.icNameSpace,
  'VerifyAuthorizeSessionTransaction'
);
module.exports = VerifyAuthorizeSession;
