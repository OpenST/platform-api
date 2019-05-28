/**
 * Module to verify initiate recovery transaction.
 *
 * @module lib/deviceRecovery/byOwner/initiateRecovery/VerifyTransaction
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  DeviceRecoveryBase = require(rootPrefix + '/lib/deviceRecovery/Base'),
  // ErrorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  // SendTransactionalMail = require(rootPrefix + '/lib/email/hookCreator/SendTransactionalMail'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  rabbitmqProvider = require(rootPrefix + '/lib/providers/rabbitmq'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device'),
  rabbitmqConstants = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  // createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  recoveryOperationConstants = require(rootPrefix + '/lib/globalConstant/recoveryOperation'),
  connectionTimeoutConstants = require(rootPrefix + '/lib/globalConstant/connectionTimeout'),
  webhookPreprocessorConstants = require(rootPrefix + '/lib/globalConstant/webhookPreprocessor'),
  webhookSubscriptionsConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

/**
 * Class to verify initiate recovery transaction.
 *
 * @class VerifyTransaction
 */
class VerifyTransaction extends DeviceRecoveryBase {
  /**
   * Constructor to verify initiate recovery transaction.
   *
   * @param {object} params
   * @param {string} params.userId
   * @param {string} params.clientId
   * @param {string} params.oldDeviceAddress
   * @param {string} params.newDeviceAddress
   * @param {string/number} params.deviceShardNumber
   * @param {string/number} params.recoveryOperationId
   * @param {string/number} params.initiateRecoveryOperationId
   * @param {string} params.transactionHash
   * @param {string/number} params.chainId
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
  }

  /**
   * Main performer of class.
   *
   * @sets oThis.blockGenerationTime
   *
   * @returns {Promise<any>}
   */
  async perform() {
    const oThis = this;

    const transactionVerified = await oThis._checkTransactionStatus(true);

    oThis.blockGenerationTime = oThis.ic().configStrategy.auxGeth.blockGenerationTime;

    const delayedRecoveryInterval = await oThis._fetchDelayedRecoveryInterval(),
      executeAfterBlocks =
        Math.floor(Number(delayedRecoveryInterval) / oThis.blockGenerationTime) + Number(oThis.blockNumber);

    await oThis._updateRecoveryOperationStatus(
      transactionVerified,
      recoveryOperationConstants.waitingForAdminActionStatus,
      recoveryOperationConstants.failedStatus,
      executeAfterBlocks
    );

    if (transactionVerified) {
      // Send initiate recovery mail to client and ost-support.

      // NOTE: This code is commented just for some time as it is not needed right now.
      //
      // const sendTransactionalMailRsp = await new SendTransactionalMail({
      //   clientId: oThis.clientId,
      //   userId: oThis.userId
      // }).perform();
      //
      // if (sendTransactionalMailRsp.isFailure) {
      //   const errorObject = responseHelper.error({
      //     internal_error_identifier: 'initiated_recovery_mail_failure:l_dr_bo_ir_vr_3',
      //     api_error_identifier: 'initiated_recovery_mail_failure',
      //     debug_options: { clientId: oThis.clientId, userId: oThis.userId }
      //   });
      //
      //   await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);
      // }

      await oThis.sendWebhook();

      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskDone
        })
      );
    }
    await oThis._rollbackDeviceStatuses();

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskFailed
      })
    );
  }

  /**
   * Rollback device statuses.
   *
   * @return {Promise<void>}
   * @private
   */
  async _rollbackDeviceStatuses() {
    const oThis = this;

    // Change old device status from revokingStatus to authorizedStatus.
    // Change new device status from recoveringStatus to registeredStatus.
    const statusMap = {
      [oThis.oldDeviceAddress]: {
        initial: deviceConstants.revokingStatus,
        final: deviceConstants.authorizedStatus
      },
      [oThis.newDeviceAddress]: {
        initial: deviceConstants.recoveringStatus,
        final: deviceConstants.registeredStatus
      }
    };

    await oThis._changeDeviceStatuses(statusMap);
  }

  /**
   * Fetch token details.
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchDelayedRecoveryInterval() {
    const oThis = this,
      TokenCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token');

    const cacheResponse = await new TokenCache({ clientId: oThis.clientId }).fetch();
    if (cacheResponse.isFailure() || !cacheResponse.data) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'l_dr_bo_ir_vr_2',
          api_error_identifier: 'invalid_params',
          params_error_identifiers: ['invalid_token_id'],
          debug_options: { clientId: oThis.clientId }
        })
      );
    }

    return cacheResponse.data.delayedRecoveryInterval; // This is time in seconds.
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
          webhookKind: webhookSubscriptionsConstants.devicesInitiateRecoveryTopic,
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
  'VerifyInitiateRecoveryTransaction'
);

module.exports = {};
