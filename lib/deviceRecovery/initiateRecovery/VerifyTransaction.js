/**
 * This class file verifies if the perform transaction was done successfully.
 *
 * @module lib/deviceRecovery/initiateRecovery/VerifyTransaction
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CheckTxStatus = require(rootPrefix + '/lib/transactions/CheckTxStatus'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  RecoveryOperationModel = require(rootPrefix + '/app/models/mysql/RecoveryOperation'),
  recoveryOperationConstants = require(rootPrefix + '/lib/globalConstant/recoveryOperation');

/**
 * Class to verify initiate recovery transaction.
 *
 * @class VerifyTransaction
 */
class VerifyTransaction {
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
    const oThis = this;

    oThis.recoveryOperationId = params.recoveryOperationId;
    oThis.transactionHash = params.transactionHash;
    oThis.chainId = params.chainId;
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
   * Check transaction status.
   *
   * @return {Promise<Boolean>}
   *
   * @private
   */
  async _checkTransactionStatus() {
    const oThis = this,
      checkTxStatus = new CheckTxStatus({ chainId: oThis.chainId, transactionHash: oThis.transactionHash }),
      response = await checkTxStatus.perform();

    return response.isSuccess();
  }

  /**
   * Update recovery operation status as success or failed.
   *
   * @param {Boolean} transactionVerified
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _updateRecoveryOperationStatus(transactionVerified) {
    const oThis = this;

    let status = null;

    if (transactionVerified) {
      status = recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.waitingForAdminActionStatus];
    } else {
      status = recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.failedStatus];
    }

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
