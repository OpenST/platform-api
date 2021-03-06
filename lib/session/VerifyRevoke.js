/**
 * Module to verify revoke session transaction.
 *
 * @module lib/session/VerifyRevoke
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  sessionConstants = require(rootPrefix + '/lib/globalConstant/session'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/transactions/GetTxEvent');
require(rootPrefix + '/app/models/ddb/sharded/Session');

// Declare variables.
const contractNamesArray = ['GnosisSafe', 'TokenHolder'];
const eventName = 'SessionRevoked';

/**
 * Class to verify revoke session transaction.
 *
 * @class VerifyRevokeSession
 */
class VerifyRevokeSession {
  /**
   * Constructor to verify revoke session transaction.
   *
   * @param {object} params
   * @param {string} params.sessionKey
   * @param {string} params.transactionHash
   * @param {number/string} params.chainId
   * @param {string} params.userId
   * @param {number/string} params.sessionShardNumber
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.sessionKey = params.sessionKey;
    oThis.transactionHash = params.transactionHash;
    oThis.chainId = params.chainId;
    oThis.userId = params.userId;
    oThis.sessionShardNumber = params.sessionShardNumber;
  }

  /**
   * Main performer for class.
   *
   * @returns {Promise<any>}
   */
  async perform() {
    const oThis = this;

    const eventsData = await oThis._fetchEventsData();

    if (eventsData.isFailure()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskFailed
        })
      );
    }

    const checkResponse = oThis._checkEventsData(eventsData.data);

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

    const paramsForGetTxEvent = {
      chainId: oThis.chainId,
      transactionHash: oThis.transactionHash,
      contractNames: contractNamesArray,
      eventNamesMap: {}
    };
    paramsForGetTxEvent.eventNamesMap[eventName] = 1;
    const GetTxEvent = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'GetTxEvent'),
      getTxEventObj = new GetTxEvent(paramsForGetTxEvent),
      eventsRsp = await getTxEventObj.perform();

    if (eventsRsp.isFailure()) {
      logger.error('Error in reading events');

      return eventsRsp;
    }

    const eventsData = eventsRsp.data;

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
   * This function checks if 'SessionRevoked' event is present in events data passed.
   *
   * @param {object} eventsData
   *
   * @returns {*|result|*}
   * @private
   */
  _checkEventsData(eventsData) {
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

    const SessionModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionModel'),
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

module.exports = {};
