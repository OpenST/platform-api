/**
 * This class file verifies if the perform transaction was done successfully.
 *
 * @module lib/deviceRecovery/byOwner/initiateRecovery/VerifyTransaction
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  emailNotifier = require(rootPrefix + '/lib/notifier'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device'),
  DeviceRecoveryBase = require(rootPrefix + '/lib/deviceRecovery/Base'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  SendTransactionalMail = require(rootPrefix + '/lib/email/hookCreator/SendTransactionalMail'),
  recoveryOperationConstants = require(rootPrefix + '/lib/globalConstant/recoveryOperation');

/**
 * Class to verify initiate recovery transaction.
 *
 * @class VerifyTransaction
 */
class VerifyTransaction extends DeviceRecoveryBase {
  /**
   * Constructor to verify initiate recovery transaction.
   *
   * @param {Object} params
   * @param {String} params.userId
   * @param {String} params.clientId
   * @param {String} params.oldDeviceAddress
   * @param {String} params.newDeviceAddress
   * @param {String/Number} params.deviceShardNumber
   * @param {String/Number} params.recoveryOperationId
   * @param {String/Number} params.initiateRecoveryOperationId
   * @param {String} params.transactionHash
   * @param {String/Number} params.chainId
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
   * Perform
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
      const sendTransactionalMailRsp = await new SendTransactionalMail({
        clientId: oThis.clientId,
        userId: oThis.userId
      }).perform();

      // TODO - check this
      if (sendTransactionalMailRsp.isFailure) {
        await emailNotifier.perform(
          'l_dr_bo_ir_vr_3',
          `Could not send mail for initiated recovery of clientId: ${oThis.clientId}`,
          {},
          {}
        );
      }

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
   *
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
   *
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
}

InstanceComposer.registerAsShadowableClass(
  VerifyTransaction,
  coreConstants.icNameSpace,
  'VerifyInitiateRecoveryTransaction'
);

module.exports = {};
