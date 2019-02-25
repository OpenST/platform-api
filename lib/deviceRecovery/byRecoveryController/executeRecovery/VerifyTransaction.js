/**
 * This class file verifies if the perform transaction was done successfully.
 *
 * @module lib/deviceRecovery/byRecoveryController/executeRecovery/VerifyTransaction
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device'),
  DeviceRecoveryBase = require(rootPrefix + '/lib/deviceRecovery/Base'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  recoveryOperationConstants = require(rootPrefix + '/lib/globalConstant/recoveryOperation');

/**
 * Class to verify execute recovery transaction.
 *
 * @class VerifyTransaction
 */
class VerifyTransaction extends DeviceRecoveryBase {
  /**
   * Constructor to verify execute recovery transaction.
   *
   * @param {Object} params
   * @param {String} params.userId
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

    oThis.configStrategy = oThis.ic().configStrategy;
  }

  /**
   * Perform
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
      recoveryOperationConstants.adminActionFailedStatus
    );

    await oThis._updateDeviceStatuses(transactionVerified);

    if (transactionVerified) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskDone
        })
      );
    } else {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskFailed
        })
      );
    }
  }

  /**
   * Update device statuses.
   *
   * @param {Boolean} transactionVerified
   *
   * @return {Promise<void>}
   *
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
    } else {
      // Change old device status from revokingStatus to authorizedStatus.
      // Change new device status from recoveringStatus to registeredStatus.
      statusMap = {
        [oThis.oldDeviceAddress]: {
          initial: deviceConstants.revokingStatus,
          final: deviceConstants.authorizedStatus
        },
        [oThis.newDeviceAddress]: {
          initial: deviceConstants.recoveringStatus,
          final: deviceConstants.registeredStatus
        }
      };
    }

    await oThis._changeDeviceStatuses(statusMap);
  }
}

InstanceComposer.registerAsShadowableClass(
  VerifyTransaction,
  coreConstants.icNameSpace,
  'VerifyExecuteRecoveryTransaction'
);

module.exports = {};
