/**
 * Module to verify if logout sessions was done successfully.
 *
 * @module lib/session/VerifyLogout
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/transactions/GetTxEvent');
require(rootPrefix + '/app/models/ddb/sharded/Session');
require(rootPrefix + '/lib/cacheManagement/chain/UserSessionAddress');

/**
 * Class to verify if logout sessions was done successfully.
 *
 * @class VerifyLogoutSession
 */
class VerifyLogoutSession {
  /**
   * Constructor to verify if logout sessions was done successfully.
   *
   * @param {object} params
   * @param {number/string} params.tokenId
   * @param {string} params.sessionKey
   * @param {string} params.transactionHash
   * @param {number/string} params.chainId
   * @param {string} params.userId
   * @param {number/string} params.sessionShardNumber
   * @param {number/string} params.userShardNumber
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
      // As transaction is failed or logged out event not found,
      // Set token holder status back to Active.
      await oThis._updateTokenHolderStatus(tokenUserConstants.tokenHolderActiveStatus);

      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskFailed
        })
      );
    }

    // Delete all sessions of user.
    await oThis._deleteSessions();

    // Update token holder status as logged out.
    await oThis._updateTokenHolderStatus(tokenUserConstants.tokenHolderLoggedOutStatus);

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
   * @param {object} eventsData
   *
   * @returns {*|result|*}
   * @private
   */
  _checkEventsData(eventsData) {
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
   * @private
   */
  async _deleteSessions() {
    const oThis = this;

    const UserSessionAddressCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'UserSessionAddressCache'),
      userSessionAddressCacheObj = new UserSessionAddressCache({
        userId: oThis.userId,
        shardNumber: oThis.sessionShardNumber
      });

    const userSessionAddressesResponse = await userSessionAddressCacheObj.fetch();

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

    const userSessionAddresses = userSessionAddressesResponse.data.addresses,
      deleteParams = [],
      sessionAddresses = [];

    for (let index = 0; index < userSessionAddresses.length; index++) {
      deleteParams.push({
        userId: oThis.userId,
        address: userSessionAddresses[index]
      });
      sessionAddresses.push(userSessionAddresses[index]);
    }

    const SessionModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionModel'),
      sessionModelObj = new SessionModel({ shardNumber: oThis.sessionShardNumber });

    const response = await sessionModelObj.batchDeleteItem(deleteParams);

    if (response.isFailure()) {
      logger.error('Could not delete sessions.');

      // TODO: Send exception email.
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_vl_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    // Clear session cache
    await SessionModel.afterUpdate(oThis.ic(), { userId: oThis.userId, addresses: sessionAddresses });
  }

  /**
   * Update token holder status as logged out.
   *
   * @returns {Promise<never>}
   * @private
   */
  async _updateTokenHolderStatus(updateStatus) {
    const oThis = this,
      UserModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserModel'),
      userModelObj = new UserModel({
        shardNumber: oThis.userShardNumber
      });

    const updateParams = {
      tokenId: oThis.tokenId,
      userId: oThis.userId,
      tokenHolderStatus: updateStatus
    };
    const response = await userModelObj.updateItem(updateParams, null, 'ALL_NEW');

    if (response.isFailure()) {
      logger.error('Could not update token holder status in user.');

      // TODO: Send exception email.
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_vl_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }
  }
}

InstanceComposer.registerAsShadowableClass(
  VerifyLogoutSession,
  coreConstants.icNameSpace,
  'VerifyLogoutSessionTransaction'
);

module.exports = {};
