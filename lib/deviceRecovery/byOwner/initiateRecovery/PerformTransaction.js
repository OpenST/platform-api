/**
 * This class file helps in submitting initiate recovery transaction by user.
 *
 * @module lib/deviceRecovery/byOwner/initiateRecovery/PerformTransaction
 */

const OpenStJs = require('@openstfoundation/openst.js'),
  OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer,
  RecoveryHelper = OpenStJs.Helpers.Recovery;

const rootPrefix = '../../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  DeviceRecoveryBase = require(rootPrefix + '/lib/deviceRecovery/Base'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  RecoveryOperationModel = require(rootPrefix + '/app/models/mysql/RecoveryOperation'),
  recoveryOperationConstants = require(rootPrefix + '/lib/globalConstant/recoveryOperation');

/**
 * Class to initiate recovery.
 *
 * @class InitiateRecovery
 */
class InitiateRecovery extends DeviceRecoveryBase {
  /**
   * Constructor to initiate recovery.
   *
   * @param {Object} params
   * @param {String} params.oldLinkedAddress
   * @param {String} params.oldDeviceAddress
   * @param {String} params.newDeviceAddress
   * @param {String} params.signature
   * @param {String} params.recoveryAddress
   * @param {Object} [params.pendingTransactionExtraData]
   * @param {String/Number} params.auxChainId
   * @param {String/Number} params.tokenId
   * @param {String/Number} params.workflowId
   * @param {String/Number} params.recoveryOperationId
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.oldLinkedAddress = params.oldLinkedAddress;
    oThis.oldDeviceAddress = params.oldDeviceAddress;
    oThis.newDeviceAddress = params.newDeviceAddress;
    oThis.signature = params.signature;
    oThis.workflowId = params.workflowId;
    oThis.recoveryOperationId = params.recoveryOperationId;

    oThis.recoveryOperationStatus = null;
  }

  /**
   * Perform
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
          internal_error_identifier: 'l_dr_bo_ir_pt_1',
          api_error_identifier: 'recovery_already_in_progress',
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
   * @return {Promise<void>}
   *
   * @private
   */
  async _updateRecoveryOperation() {
    const oThis = this,
      isRecoveryAlreadyOngoing = await oThis._isRecoveryAlreadyOngoing();

    if (isRecoveryAlreadyOngoing) {
      logger.error('Cannot initiate recovery for user as recovery is already on-going.');
      oThis.recoveryOperationStatus =
        recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.failedStatus];
    } else {
      oThis.recoveryOperationStatus =
        recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.inProgressStatus];
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
   *
   * @private
   */
  async _performTransaction() {
    const oThis = this;

    const decodedSignature = basicHelper.generateRsvFromSignature(oThis.signature),
      recoveryHelperObj = new RecoveryHelper(oThis.web3Instance, oThis.recoveryAddress);

    const txObject = await recoveryHelperObj.initiateRecoveryRawTx(
      oThis.web3Instance.utils.toChecksumAddress(oThis.oldLinkedAddress),
      oThis.web3Instance.utils.toChecksumAddress(oThis.oldDeviceAddress),
      oThis.web3Instance.utils.toChecksumAddress(oThis.newDeviceAddress),
      decodedSignature.r,
      decodedSignature.s,
      decodedSignature.v
    );

    const txOptions = {
      from: oThis.fromAddress,
      to: oThis.recoveryAddress,
      gasPrice: contractConstants.auxChainGasPrice,
      gas: contractConstants.initiateRecoveryGas,
      value: contractConstants.zeroValue
    };

    txOptions.data = txObject.encodeABI();

    return await oThis._submitTransaction(txOptions);
  }

  /**
   * Rollback device statuses in case of failure.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _rollbackDeviceStatuses() {
    const oThis = this,
      deviceConstants = require(rootPrefix + '/lib/globalConstant/device');

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
   * Steps to be performed if transaction fails.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _performTransactionFailedSteps() {
    const oThis = this;

    await oThis._rollbackDeviceStatuses();

    await super._performTransactionFailedSteps();
  }
}

InstanceComposer.registerAsShadowableClass(
  InitiateRecovery,
  coreConstants.icNameSpace,
  'PerformInitiateRecoveryTransaction'
);

module.exports = {};
