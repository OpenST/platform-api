'use strict';
/**
 * This class file verifies if the revoke session was done successfully.
 *
 * @module lib/session/VerifyRevoke
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

const contractNamesArray = ['GnosisSafe', 'TokenHolder'];
const eventName = 'SessionRevoked';

class VerifyRevokeSession {
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

    await oThis._markRevokedInSessionsTable();

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
      contractNames: contractNamesArray,
      eventNamesMap: {}
    };
    paramsForGetTxEvent.eventNamesMap[eventName] = 1;
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
        internal_error_identifier: 'l_s_vr_1',
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

    if (!eventsData.hasOwnProperty(eventName)) {
      logger.error(eventName, ' event not found.');
      return responseHelper.error({
        internal_error_identifier: 'l_s_vr_2',
        api_error_identifier: 'something_went_wrong',
        debug_options: {}
      });
    }

    return responseHelper.successWithData({});
  }

  /**
   * Marks session revoked in sessions table.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _markRevokedInSessionsTable() {
    const oThis = this;

    let SessionModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionModel'),
      sessionModelObj = new SessionModel({ shardNumber: oThis.sessionShardNumber }),
      updateRsp = await sessionModelObj.updateStatusFromInitialToFinal(
        oThis.userId,
        oThis.sessionKey,
        sessionConstants.revokingStatus,
        sessionConstants.revokedStatus
      );

    return updateRsp;
  }
}

InstanceComposer.registerAsShadowableClass(
  VerifyRevokeSession,
  coreConstants.icNameSpace,
  'VerifyRevokeSessionTransaction'
);
module.exports = VerifyRevokeSession;
