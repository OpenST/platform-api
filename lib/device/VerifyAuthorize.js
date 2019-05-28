/**
 * Module to verify if the authorize transaction was done successfully.
 *
 * @module lib/device/VerifyAuthorize
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  rabbitmqProvider = require(rootPrefix + '/lib/providers/rabbitmq'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device'),
  rabbitmqConstants = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  connectionTimeoutConstants = require(rootPrefix + '/lib/globalConstant/connectionTimeout'),
  webhookPreprocessorConstants = require(rootPrefix + '/lib/globalConstant/webhookPreprocessor'),
  webhookSubscriptionsConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/transactions/GetTxEvent');
require(rootPrefix + '/lib/device/UpdateStatus');
require(rootPrefix + '/lib/cacheManagement/chain/PreviousOwnersMap');

/**
 * Class to verify if the authorize transaction was done successfully.
 *
 * @class VerifyAuthorize
 */
class VerifyAuthorize {
  /**
   * Constructor to verify if the authorize transaction was done successfully.
   *
   * @param {object} params
   * @param {string} params.userId
   * @param {string/number} params.chainId
   * @param {string/number} params.tokenId
   * @param {string/number} params.clientId
   * @param {string} params.deviceAddress
   * @param {string} params.transactionHash
   * @param {number} params.deviceShardNumber
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.userId = params.userId;
    oThis.tokenId = params.tokenId;
    oThis.clientId = params.clientId;
    oThis.chainId = params.chainId;
    oThis.deviceAddress = params.deviceAddress;
    oThis.transactionHash = params.transactionHash;
    oThis.deviceShardNumber = params.deviceShardNumber;
  }

  /**
   * Main performer for class.
   *
   * @returns {Promise<any>}
   */
  async perform() {
    const oThis = this;

    await oThis._clearLinkedDeviceAddressCacheMap();

    const eventsData = await oThis._fetchContractEventsData();

    if (eventsData.isFailure()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskFailed
        })
      );
    }

    const eventsCheckResponse = await oThis._checkEventsData(eventsData.data);

    if (eventsCheckResponse.isFailure()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskFailed
        })
      );
    }

    await oThis._markAuthorizedInDevicesTable();

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
  async _fetchContractEventsData() {
    const oThis = this;

    const paramsForGetTxEvent = {
        chainId: oThis.chainId,
        transactionHash: oThis.transactionHash,
        contractNames: ['GnosisSafe'],
        eventNamesMap: { AddedOwner: 1 }
      },
      GetTxEvent = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'GetTxEvent'),
      getTxEventObj = new GetTxEvent(paramsForGetTxEvent),
      eventsRsp = await getTxEventObj.perform();

    if (eventsRsp.isFailure()) {
      logger.error('Error in reading events');

      return eventsRsp;
    }

    const eventsData = eventsRsp.data;

    if (basicHelper.isEmptyObject(eventsData)) {
      logger.error('Events data is empty');

      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_d_va_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return eventsRsp;
  }

  /**
   * This function checks if 'AddedOwner' event is present in events data passed.
   *
   * @param {object} eventsData
   *
   * @returns {Promise<never>}
   * @private
   */
  async _checkEventsData(eventsData) {
    if (!eventsData.hasOwnProperty('AddedOwner')) {
      logger.error('Transaction not successful');

      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_d_va_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return responseHelper.successWithData({});
  }

  /**
   * Mark the device authorized.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _markAuthorizedInDevicesTable() {
    const oThis = this;

    const paramsToUpdateDeviceStatus = {
      chainId: oThis.chainId,
      userId: oThis.userId,
      initialStatus: deviceConstants.authorizingStatus,
      finalStatus: deviceConstants.authorizedStatus,
      shardNumber: oThis.deviceShardNumber,
      walletAddress: oThis.deviceAddress
    };
    const UpdateDeviceStatusKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UpdateDeviceStatus'),
      updateDeviceStatusObj = new UpdateDeviceStatusKlass(paramsToUpdateDeviceStatus);

    return updateDeviceStatusObj.perform();
  }

  /**
   * Clear linked device address map cache.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _clearLinkedDeviceAddressCacheMap() {
    const oThis = this,
      PreviousOwnersMapCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'PreviousOwnersMap'),
      previousOwnersMapObj = new PreviousOwnersMapCache({ userId: oThis.userId, tokenId: oThis.tokenId });

    await previousOwnersMapObj.clear();
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
          webhookKind: webhookSubscriptionsConstants.devicesAuthorizedTopic,
          clientId: oThis.clientId,
          userId: oThis.userId,
          deviceAddress: oThis.deviceAddress
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
  VerifyAuthorize,
  coreConstants.icNameSpace,
  'VerifyAuthorizeDeviceTransaction'
);
module.exports = VerifyAuthorize;
