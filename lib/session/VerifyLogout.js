'use strict';
/**
 * This class file verifies if logout sessions was done successfully.
 *
 * @module lib/session/VerifyLogout
 */

const OSTBase = require('@ostdotcom/base');

const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  sessionConstants = require(rootPrefix + '/lib/globalConstant/session'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/lib/transactions/GetTxEvent');
require(rootPrefix + '/app/models/ddb/sharded/Session');
require(rootPrefix + '/lib/cacheManagement/chain/UserSessionAddress');

class VerifyLogoutSession {
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

    const eventsData = await oThis._fetchEventsData();

    if (eventsData.isFailure()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskFailed
        })
      );
    }

    const checkResponse = await oThis._checkEventsData(eventsData.data);

    if (checkResponse.isFailure()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskFailed
        })
      );
    }

    await oThis._deleteSessions();

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
      contractNames: ['GnosisSafe', 'TokenHolder'],
      eventNamesMap: { SessionsLoggedOut: 1 }
    };
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
        internal_error_identifier: 'l_s_vl_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: {}
      });
    }

    return eventsRsp;
  }

  /**
   * This function checks if 'SessionsLoggedOut' event is present in events data passed.
   *
   * @param eventsData
   * @returns {Promise<*>}
   * @private
   */
  async _checkEventsData(eventsData) {
    if (!eventsData.hasOwnProperty('SessionsLoggedOut')) {
      logger.error('SessionsLoggedOut event not found.');
      return responseHelper.error({
        internal_error_identifier: 'l_s_vl_2',
        api_error_identifier: 'something_went_wrong',
        debug_options: {}
      });
    }

    return responseHelper.successWithData({});
  }

  /**
   * Delete all sessions
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _deleteSessions() {
    const oThis = this;
    let UserSessionAddressCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserSessionAddressCache'),
      userSessionAddressCacheObj = new UserSessionAddressCache({
        userId: oThis.userId,
        shardNumber: oThis.sessionShardNumber
      });

    let userSessionAddressesResponse = await userSessionAddressCacheObj.fetch();

    if (userSessionAddressesResponse.isFailure()) {
      logger.error('Could not fetched token details.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_vl_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    let userSessionAddresses = userSessionAddressesResponse.data.addresses,
      deleteParams = [];

    for (let index = 0; index < userSessionAddresses.length; index++) {
      deleteParams.push({
        userId: oThis.userId,
        address: userSessionAddresses[index]
      });
    }

    let SessionModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionModel'),
      sessionModelObj = new SessionModel({ shardNumber: oThis.sessionShardNumber });

    await sessionModelObj.batchDeleteItem(deleteParams);
  }
}

InstanceComposer.registerAsShadowableClass(
  VerifyLogoutSession,
  coreConstants.icNameSpace,
  'VerifyLogoutSessionTransaction'
);

module.exports = {};
