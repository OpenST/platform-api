/**
 * Module to verify abort recovery transaction.
 *
 * @module lib/deviceRecovery/byOwner/abortRecovery/VerifyTransaction
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  DeviceRecoveryBase = require(rootPrefix + '/lib/deviceRecovery/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  recoveryOperationConstants = require(rootPrefix + '/lib/globalConstant/recoveryOperation');

/**
 * Class to verify abort recovery transaction.
 *
 * @class VerifyTransaction
 */
class VerifyTransaction extends DeviceRecoveryBase {
  /**
   * Constructor to verify abort recovery transaction.
   *
   * @param {object} params
   * @param {string} params.userId
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
      recoveryOperationConstants.abortedStatus,
      recoveryOperationConstants.waitingForAdminActionStatus,
      0
    );

    if (transactionVerified) {
      await oThis._updateDeviceStatuses();

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
   * @return {Promise<void>}
   * @private
   */
  async _updateDeviceStatuses() {
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
}

InstanceComposer.registerAsShadowableClass(
  VerifyTransaction,
  coreConstants.icNameSpace,
  'VerifyAbortRecoveryTransaction'
);

module.exports = {};
