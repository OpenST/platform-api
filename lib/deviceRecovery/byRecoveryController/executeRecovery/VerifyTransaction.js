/**
 * Module to verify execute recovery transaction.
 *
 * @module lib/deviceRecovery/byRecoveryController/executeRecovery/VerifyTransaction
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  DeviceRecoveryBase = require(rootPrefix + '/lib/deviceRecovery/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  rabbitmqProvider = require(rootPrefix + '/lib/providers/rabbitmq'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device'),
  rabbitmqConstants = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  recoveryOperationConstants = require(rootPrefix + '/lib/globalConstant/recoveryOperation'),
  connectionTimeoutConstants = require(rootPrefix + '/lib/globalConstant/connectionTimeout'),
  webhookPreprocessorConstants = require(rootPrefix + '/lib/globalConstant/webhookPreprocessor'),
  webhookSubscriptionsConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chain/PreviousOwnersMap');

/**
 * Class to verify execute recovery transaction.
 *
 * @class VerifyTransaction
 */
class VerifyTransaction extends DeviceRecoveryBase {
  /**
   * Constructor to verify execute recovery transaction.
   *
   * @param {object} params
   * @param {string} params.userId
   * @param {string} params.oldDeviceAddress
   * @param {string} params.newDeviceAddress
   * @param {string/number} params.deviceShardNumber
   * @param {string/number} params.recoveryOperationId
   * @param {string/number} params.initiateRecoveryOperationId
   * @param {string} params.transactionHash
   * @param {string/number} params.tokenId
   * @param {string/number} params.chainId
   * @param {string/number} params.clientId
   *
   * @augments DeviceRecoveryBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.oldDeviceAddress = params.oldDeviceAddress;
    oThis.newDeviceAddress = params.newDeviceAddress;
    oThis.recoveryOperationId = params.recoveryOperationId;
    oThis.clientId = params.clientId;

    oThis.configStrategy = oThis.ic().configStrategy;
  }

  /**
   * Main performer of class.
   *
   * @returns {Promise<any>}
   */
  async perform() {
    const oThis = this;

    const transactionVerified = await oThis._checkTransactionStatus();

    await oThis._updateRecoveryOperationStatus(
      transactionVerified,
      recoveryOperationConstants.completedStatus,
      recoveryOperationConstants.failedStatus
    );

    await oThis._updateInitiateRecoveryOperationStatus(
      transactionVerified,
      recoveryOperationConstants.completedStatus,
      recoveryOperationConstants.adminActionFailedStatus,
      0
    );

    await oThis._updateDeviceStatuses(transactionVerified);

    await oThis._clearLinkedDeviceAddressCacheMap();

    if (transactionVerified) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskDone
        })
      );
    }

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskFailed
      })
    );
  }

  /**
   * Update device statuses.
   *
   * @param {boolean} transactionVerified
   *
   * @return {Promise<void>}
   * @private
   */
  async _updateDeviceStatuses(transactionVerified) {
    const oThis = this;

    let statusMap = {};

    if (transactionVerified) {
      // Change old device status from revokingStatus to revokedStatus.
      // Change new device status from recoveringStatus to authorizedStatus.
      statusMap = {
        [oThis.oldDeviceAddress]: {
          initial: deviceConstants.revokingStatus,
          final: deviceConstants.revokedStatus
        },
        [oThis.newDeviceAddress]: {
          initial: deviceConstants.recoveringStatus,
          final: deviceConstants.authorizedStatus
        }
      };
      await oThis._changeDeviceStatuses(statusMap);

      await oThis.sendWebhook();
    } else {
      // TODO: Discuss this scenario and update accordingly
      // Device status should not be changed as chain still has Active recovery info
      // // Change old device status from revokingStatus to authorizedStatus.
      // // Change new device status from recoveringStatus to registeredStatus.
      // statusMap = {
      //   [oThis.oldDeviceAddress]: {
      //     initial: deviceConstants.revokingStatus,
      //     final: deviceConstants.authorizedStatus
      //   },
      //   [oThis.newDeviceAddress]: {
      //     initial: deviceConstants.recoveringStatus,
      //     final: deviceConstants.registeredStatus
      //   }
      // };
    }
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
          webhookKind: webhookSubscriptionsConstants.devicesRecoverySuccessTopic,
          clientId: oThis.clientId,
          userId: oThis.userId,
          oldDeviceAddress: oThis.oldDeviceAddress,
          newDeviceAddress: oThis.newDeviceAddress
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
  VerifyTransaction,
  coreConstants.icNameSpace,
  'VerifyExecuteRecoveryTransaction'
);

module.exports = {};
