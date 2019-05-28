/**
 * Module to verify authorize session transaction.
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
  rabbitmqProvider = require(rootPrefix + '/lib/providers/rabbitmq'),
  sessionConstants = require(rootPrefix + '/lib/globalConstant/session'),
  rabbitmqConstants = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  connectionTimeoutConstants = require(rootPrefix + '/lib/globalConstant/connectionTimeout'),
  webhookPreprocessorConstants = require(rootPrefix + '/lib/globalConstant/webhookPreprocessor'),
  webhookSubscriptionsConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/transactions/GetTxEvent');
require(rootPrefix + '/app/models/ddb/sharded/Session');

/**
 * Class to verify authorize session transaction.
 *
 * @class VerifyAuthorizeSession
 */
class VerifyAuthorizeSession {
  /**
   * Constructor to verify authorize session transaction.
   *
   * @param {object} params
   * @param {number/string} params.tokenId
   * @param {string} params.sessionKey
   * @param {string} params.transactionHash
   * @param {number/string} params.chainId
   * @param {string} params.userId
   * @param {number/string} params.sessionShardNumber
   * @param {number/string} params.userShardNumber
   * @param {number/string} params.clientId
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.tokenId = params.tokenId;
    oThis.sessionKey = params.sessionKey;
    oThis.transactionHash = params.transactionHash;
    oThis.chainId = params.chainId;
    oThis.userId = params.userId;
    oThis.sessionShardNumber = params.sessionShardNumber;
    oThis.userShardNumber = params.userShardNumber;
    oThis.clientId = params.clientId;
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

    await oThis._markAuthorizedInSessionsTable();

    // If its first session after logging out, then mark status as active.
    await oThis._updateTokenHolderStatus();

    await oThis.sendWebhook();

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
   * This function checks if 'SessionAuthorized' event is present in events data passed.
   *
   * @param {object} eventsData
   *
   * @returns {*|result|*}
   * @private
   */
  _checkEventsData(eventsData) {
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

    const SessionModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionModel'),
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
   * Update token holder status as active if its not active.
   *
   * @returns {Promise<never>}
   * @private
   */
  async _updateTokenHolderStatus() {
    const oThis = this;

    const TokenUserDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache');

    const tokenUserDetailsCache = new TokenUserDetailsCache({
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

      const updateParams = {
        tokenId: oThis.tokenId,
        userId: oThis.userId,
        tokenHolderStatus: tokenUserConstants.tokenHolderActiveStatus
      };
      await userModelObj.updateItem(updateParams, null, 'ALL_NEW');
    }
  }

  /**
   * Send webhook message to Preprocessor.
   *
   * @returns {Promise<*>}
   */
  async sendWebhook() {
    const oThis = this;

    const rmqConnection = await rabbitmqProvider.getInstance(rabbitmqConstants.auxWebhooksPreprocessorRabbitmqKind, {
      auxChainId: oThis.chainId,
      connectionWaitSeconds: connectionTimeoutConstants.crons,
      switchConnectionWaitSeconds: connectionTimeoutConstants.switchConnectionCrons
    });

    const messageParams = {
      topics: webhookPreprocessorConstants.topics,
      publisher: webhookPreprocessorConstants.publisher,
      message: {
        kind: webhookPreprocessorConstants.messageKind,
        payload: {
          webhookKind: webhookSubscriptionsConstants.sessionsAuthorizedTopic,
          clientId: oThis.clientId,
          userId: oThis.userId,
          sessionKey: oThis.sessionKey
        }
      }
    };

    const setToRMQ = await rmqConnection.publishEvent.perform(messageParams);

    if (setToRMQ.isFailure() || setToRMQ.data.publishedToRmq === 0) {
      logger.error('Could not publish the message to RMQ.');

      return setToRMQ;
    }
  }
}

InstanceComposer.registerAsShadowableClass(
  VerifyAuthorizeSession,
  coreConstants.icNameSpace,
  'VerifyAuthorizeSessionTransaction'
);

module.exports = {};
