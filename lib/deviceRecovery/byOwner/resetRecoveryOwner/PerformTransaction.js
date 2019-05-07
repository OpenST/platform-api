/**
 * This class file helps in submitting reset recovery owner by user.
 *
 * @module lib/deviceRecovery/byOwner/resetRecoveryOwner/PerformTransaction
 */

const OpenStJs = require('@openst/openst.js'),
  OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer,
  RecoveryHelper = OpenStJs.Helpers.Recovery;

const rootPrefix = '../../../..',
  DeviceRecoveryBase = require(rootPrefix + '/lib/deviceRecovery/Base'),
  RecoveryOperationModel = require(rootPrefix + '/app/models/mysql/RecoveryOperation'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

/**
 * Class to reset recovery owner.
 *
 * @class ResetRecoveryOwner
 */
class ResetRecoveryOwner extends DeviceRecoveryBase {
  /**
   * Constructor to reset recovery owner
   *
   * @param {object} params
   * @param {string/number} params.oldRecoveryOwnerAddress
   * @param {string/number} params.newRecoveryOwnerAddress
   * @param {string} params.signature
   * @param {string} params.recoveryAddress
   * @param {object} [params.pendingTransactionExtraData]
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

    oThis.signature = params.signature;
    oThis.workflowId = params.workflowId;
    oThis.recoveryOperationId = params.recoveryOperationId;
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

    await oThis._fetchFromAddress();

    return await oThis._performTransaction();
  }

  /**
   * Update workflowId of recovery operation.
   *
   * @return {Promise<void>}
   * @private
   */
  async _updateRecoveryOperation() {
    const oThis = this;

    return new RecoveryOperationModel().updateRecoveryOperation(oThis.recoveryOperationId, {
      token_id: oThis.tokenId,
      user_id: oThis.userId,
      workflow_id: oThis.workflowId
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
   * @private
   */
  async _performTransactionFailedSteps() {
    const oThis = this;

    await oThis._rollbackRecoveryOwnerStatuses();

    await super._performTransactionFailedSteps();
  }

  /**
   * Pending transaction kind.
   *
   * @private
   * @return {string}
   */
  get _pendingTransactionKind() {
    return pendingTransactionConstants.resetRecoveryOwnerKind;
  }
}

InstanceComposer.registerAsShadowableClass(
  ResetRecoveryOwner,
  coreConstants.icNameSpace,
  'PerformResetRecoveryOwnerTransaction'
);

module.exports = {};
