/**
 * This class file helps in submitting reset recovery owner by user.
 *
 * @module lib/deviceRecovery/byOwner/resetRecoveryOwner/PerformTransaction
 */

const OpenStJs = require('@openstfoundation/openst.js'),
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  RecoveryHelper = OpenStJs.Helpers.Recovery;

const rootPrefix = '../../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  DeviceRecoveryBase = require(rootPrefix + '/lib/deviceRecovery/Base'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  RecoveryOperationModel = require(rootPrefix + '/app/models/mysql/RecoveryOperation');

/**
 * Class to reset recovery owner.
 *
 * @class ResetRecoveryOwner
 */
class ResetRecoveryOwner extends DeviceRecoveryBase {
  /**
   * Constructor to reset recovery owner
   *
   * @param {Object} params
   * @param {String} params.newRecoveryOwnerAddress
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

    oThis.newRecoveryOwnerAddress = params.newRecoveryOwnerAddress;
    oThis.signature = params.signature;
    oThis.workflowId = params.workflowId;
    oThis.recoveryOperationId = params.recoveryOperationId;
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

    await oThis._fetchFromAddress();

    return await oThis._performTransaction();
  }

  /**
   * Update workflowId of recovery operation.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _updateRecoveryOperation() {
    const oThis = this;

    return new RecoveryOperationModel()
      .update({
        workflow_id: oThis.workflowId
      })
      .where({
        id: oThis.recoveryOperationId
      })
      .fire();
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

    await oThis._web3Instance();

    const decodedSignature = basicHelper.generateRsvFromSignature(oThis.signature),
      recoveryHelperObj = new RecoveryHelper(oThis.web3Instance, oThis.recoveryAddress),
      txObject = await recoveryHelperObj.resetRecoveryOwnerRawTx(
        oThis.newRecoveryOwnerAddress,
        decodedSignature.r,
        decodedSignature.s,
        decodedSignature.v
      );

    const txOptions = {
      from: oThis.fromAddress,
      to: oThis.recoveryAddress,
      gasPrice: contractConstants.auxChainGasPrice,
      gas: contractConstants.resetRecoveryOwnerGas,
      value: contractConstants.zeroValue
    };

    txOptions.data = txObject.encodeABI();

    return await oThis._submitTransaction(txOptions);
  }

  /**
   * Rollback recovery owner statuses.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _rollbackRecoveryOwnerStatuses() {
    const oThis = this,
      recoveryOwnerConstants = require(rootPrefix + '/lib/globalConstant/recoveryOwner');

    // Change old recovery owner status from revokingStatus to authorizedStatus.
    // Change new recovery owner status from authorizingStatus to registeredStatus.
    const statusMap = {
      [oThis.oldRecoveryOwnerAddress]: {
        initial: recoveryOwnerConstants.revokingStatus,
        final: recoveryOwnerConstants.authorizedStatus
      },
      [oThis.newRecoveryOwnerAddress]: {
        initial: recoveryOwnerConstants.authorizingStatus,
        final: recoveryOwnerConstants.authorizationFailedStatus
      }
    };

    await oThis._changeRecoveryOwnerStatuses(statusMap);
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

    await oThis._rollbackRecoveryOwnerStatuses();

    await super._performTransactionFailedSteps();
  }
}

InstanceComposer.registerAsShadowableClass(
  ResetRecoveryOwner,
  coreConstants.icNameSpace,
  'PerformResetRecoveryOwnerTransaction'
);

module.exports = {};
