/**
 * Module for submitting abort recovery transaction by recovery controller.
 *
 * @module lib/deviceRecovery/byRecoveryController/abortRecovery/PerformTransaction
 */

const OpenStJs = require('@openst/openst.js'),
  OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer,
  RecoveryHelper = OpenStJs.Helpers.Recovery;

const rootPrefix = '../../../..',
  DeviceRecoveryBase = require(rootPrefix + '/lib/deviceRecovery/Base'),
  RecoveryOperationModel = require(rootPrefix + '/app/models/mysql/RecoveryOperation'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  recoveryOperationConstants = require(rootPrefix + '/lib/globalConstant/recoveryOperation'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

/**
 * Class for submitting abort recovery transaction by recovery controller.
 *
 * @class AbortRecovery
 */
class AbortRecovery extends DeviceRecoveryBase {
  /**
   * Constructor for submitting abort recovery transaction by recovery controller.
   *
   * @param {object} params
   * @param {string} params.oldLinkedAddress
   * @param {string} params.oldDeviceAddress
   * @param {string} params.newDeviceAddress
   * @param {string} params.recoveryAddress
   * @param {object} params.pendingTransactionExtraData
   * @param {string/number} params.auxChainId
   * @param {string/number} params.tokenId
   * @param {string/number} params.workflowId
   * @param {string/number} params.recoveryOperationId
   *
   * @augments DeviceRecoveryBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.oldLinkedAddress = params.oldLinkedAddress;
    oThis.oldDeviceAddress = params.oldDeviceAddress;
    oThis.newDeviceAddress = params.newDeviceAddress;
    oThis.workflowId = params.workflowId;
    oThis.recoveryOperationId = params.recoveryOperationId;

    oThis.recoveryOperationStatus = null;
  }

  /**
   * Main performer of class.
   *
   * @returns {Promise<any>}
   */
  async perform() {
    const oThis = this;

    // This method updates the recovery_operations table with the workflowId and the status.
    await oThis._updateRecoveryOperation();

    if (
      oThis.recoveryOperationStatus ===
      recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.failedStatus]
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_dr_brc_ar_pt_1',
          api_error_identifier: 'recovery_never_initiated',
          debug_options: {
            recoveryAddress: oThis.recoveryAddress,
            recoveryOperationId: oThis.recoveryOperationId
          }
        })
      );
    }

    await oThis._fetchFromAddress();

    return await oThis._performTransaction();
  }

  /**
   * Get recovery info of user.
   *
   * @sets oThis.recoveryOperationStatus
   *
   * @return {Promise<void>}
   * @private
   */
  async _updateRecoveryOperation() {
    const oThis = this,
      isRecoveryAlreadyOngoing = await oThis._isRecoveryAlreadyOngoing();

    if (isRecoveryAlreadyOngoing) {
      oThis.recoveryOperationStatus =
        recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.inProgressStatus];
    } else {
      logger.error('Cannot abort recovery for user as recovery was never started.');
      oThis.recoveryOperationStatus =
        recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.failedStatus];
    }

    return new RecoveryOperationModel().updateRecoveryOperation(oThis.recoveryOperationId, {
      token_id: oThis.tokenId,
      user_id: oThis.userId,
      workflow_id: oThis.workflowId,
      status: oThis.recoveryOperationStatus
    });
  }

  /**
   * Perform transaction to initiate recovery.
   *
   * @return {Promise<*|result>}
   * @private
   */
  async _performTransaction() {
    const oThis = this;

    const recoveryHelperObj = new RecoveryHelper(oThis.web3Instance, oThis.recoveryAddress),
      txObject = await recoveryHelperObj.abortRecoveryByControllerRawTx(
        oThis.oldLinkedAddress,
        oThis.oldDeviceAddress,
        oThis.newDeviceAddress
      );

    const txOptions = {
      from: oThis.fromAddress,
      to: oThis.recoveryAddress,
      gasPrice: contractConstants.auxChainGasPrice,
      gas: contractConstants.abortRecoveryByControllerGas,
      value: contractConstants.zeroValue
    };

    txOptions.data = txObject.encodeABI();

    return await oThis._submitTransaction(txOptions);
  }

  /**
   * Pending transaction kind.
   *
   * @private
   * @return {string}
   */
  get _pendingTransactionKind() {
    return pendingTransactionConstants.abortRecoveryByRecoveryControllerKind;
  }
}

InstanceComposer.registerAsShadowableClass(
  AbortRecovery,
  coreConstants.icNameSpace,
  'PerformAbortRecoveryByRecoveryControllerTransaction'
);

module.exports = {};
