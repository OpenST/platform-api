'use strict';
/**
 * This class file verifies if the authorize session was done successfully.
 *
 * @module lib/session/VerifyAuthorize
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  sessionConstants = require(rootPrefix + '/lib/globalConstant/session'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
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
    oThis.userShardNumber = params.userShardNumber;
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

    await oThis._markAuthorizedInSessionsTable();

    // If its first session after logging out, then mark status as active.
    await oThis._updateTokenHolderStatus();

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
      eventNamesMap: { SessionAuthorized: 1 }
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

  /**
   * Update Token holder status as active if its not active.
   *
   * @returns {Promise<never>}
   * @private
   */
  async _updateTokenHolderStatus() {
    const oThis = this;

    let TokenUserDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache');

    let tokenUserDetailsCache = new TokenUserDetailsCache({
        tokenId: oThis.tokenId,
        userIds: [oThis.userId]
      }),
      tokenUserDetailsCacheRsp = await tokenUserDetailsCache.fetch();

    if (tokenUserDetailsCacheRsp.isFailure()) {
      logger.error('Could not fetched token user details.');

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_va_3',
          api_error_identifier: 'token_not_setup',
          debug_options: {}
        })
      );
    }

    const userData = tokenUserDetailsCacheRsp.data[oThis.userId];

    if (userData.tokenHolderStatus !== tokenUserConstants.tokenHolderActiveStatus) {
      // As token holder is not active, then update user
      const UserModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserModel'),
        userModelObj = new UserModel({
          shardNumber: oThis.userShardNumber
        });

      let updateParams = {
        tokenId: oThis.tokenId,
        userId: oThis.userId,
        tokenHolderStatus: tokenUserConstants.tokenHolderActiveStatus
      };
      const response = await userModelObj.updateItem(updateParams, null, 'ALL_NEW');
    }
  }
}

InstanceComposer.registerAsShadowableClass(
  VerifyAuthorizeSession,
  coreConstants.icNameSpace,
  'VerifyAuthorizeSessionTransaction'
);
module.exports = VerifyAuthorizeSession;
