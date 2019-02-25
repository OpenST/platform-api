/**
 * This class file verifies if the perform transaction was done successfully.
 *
 * @module lib/deviceRecovery/initiateRecovery/VerifyTransaction
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  DeviceRecoveryBase = require(rootPrefix + '/lib/deviceRecovery/Base'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  RecoveryOperationModel = require(rootPrefix + '/app/models/mysql/RecoveryOperation'),
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
   * @param {String/Number} params.recoveryOperationId
   * @param {String} params.transactionHash
   * @param {String/Number} params.chainId
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.recoveryOperationId = params.recoveryOperationId;
  }

  /**
   * Perform
   *
   * @returns {Promise<any>}
   */
  async perform() {
    const oThis = this;

    const transactionVerified = await oThis._checkTransactionStatus();

    await oThis._updateRecoveryOperationStatus(transactionVerified);

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone
      })
    );
  }

  /**
   * Update recovery operation status as waitingForAdminAction or failed.
   *
   * @param {Boolean} transactionVerified
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _updateRecoveryOperationStatus(transactionVerified) {
    const oThis = this,
      status = transactionVerified
        ? recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.waitingForAdminActionStatus]
        : recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.failedStatus];

    return new RecoveryOperationModel()
      .update({ status: status })
      .where({ id: oThis.recoveryOperationId })
      .fire();
  }
}

InstanceComposer.registerAsShadowableClass(
  VerifyTransaction,
  coreConstants.icNameSpace,
  'VerifyInitiateRecoveryTransaction'
);

module.exports = {};
