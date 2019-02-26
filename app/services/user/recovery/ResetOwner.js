'use strict';
/**
 * This service initiates reset recovery owner of user.
 *
 * @module app/services/user/recovery/ResetOwner
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  workflowTopicConstants = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  UserRecoveryServiceBase = require(rootPrefix + '/app/services/user/recovery/Base'),
  RecoveryOperationModelKlass = require(rootPrefix + '/app/models/mysql/RecoveryOperation'),
  recoveryOperationConstants = require(rootPrefix + '/lib/globalConstant/recoveryOperation'),
  recoveryOwnerConstants = require(rootPrefix + '/lib/globalConstant/recoveryOwner'),
  ResetRecoveryOwnerRouter = require(rootPrefix + '/lib/workflow/deviceRecovery/byOwner/resetRecoveryOwner/Router');

require(rootPrefix + '/app/models/ddb/sharded/RecoveryOwner');

/**
 * Class to reset recovery owner of user
 *
 * @class ResetOwner
 */
class ResetOwner extends UserRecoveryServiceBase {
  /**
   *
   * @param {Object} params
   * @param {Number} params.client_id
   * @param {Number} params.token_id
   * @param {String} params.user_id
   * @param {String} params.new_recovery_owner_address
   * @param {String} params.to - Transaction to address, user recovery proxy address
   * @param {String} params.signature - Packed signature data ({bytes32 r}{bytes32 s}{uint8 v})
   * @param {String} params.signer - recovery owner address who signed this transaction
   *
   * @constructor
   */
  constructor(params) {
    super(params);
  }

  /**
   * Perform basic validations on user data before recovery procedures.
   *
   * @returns {Promise<Void>}
   * @private
   */
  async _basicValidations() {
    const oThis = this;

    await super._basicValidations();

    // Check for same old and new recovery owner addresses
    if (oThis.userData.recoveryOwnerAddress == oThis.newRecoveryOwnerAddress) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_u_r_b_5',
          api_error_identifier: 'invalid_params',
          params_error_identifiers: ['same_new_and_old_recovery_owners'],
          debug_options: {}
        })
      );
    }
  }

  /**
   * Check if Recovery operation can be performed or not.
   *
   * @returns {Promise<Void>}
   * @private
   */
  async _canPerformRecoveryOperation() {
    const oThis = this;

    // Fetch all recovery operations of user
    let recoveryOperationObj = new RecoveryOperationModelKlass(),
      recoveryOperations = await recoveryOperationObj.getPendingOperationsOfTokenUser(oThis.tokenId, oThis.userId);

    for (let index in recoveryOperations) {
      let operation = recoveryOperations[index];

      // Another in progress operation is present.
      if (
        operation.status == recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.inProgressStatus]
      ) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'a_s_u_r_ro_1',
            api_error_identifier: 'another_recovery_operation_in_process',
            debug_options: {}
          })
        );
      }
    }
  }

  /**
   * Validate Devices from cache.
   *
   * @returns {Promise<never>}
   * @private
   */
  async _validateDevices() {
    // Device validation is not required for this service.
  }

  /**
   * Initiate recovery for user.
   *
   * @returns {Promise<never>}
   * @private
   */
  async _performRecoveryOperation() {
    const oThis = this;

    // Create Entry of new recovery owner
    let RecoveryOwnerModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'RecoveryOwner'),
      recoveryOwnerModelObj = new RecoveryOwnerModel({ shardNumber: oThis.userData.recoveryOwnerShardNumber });

    let resp = await recoveryOwnerModelObj.createRecoveryOwner({
      userId: oThis.userId,
      address: oThis.newRecoveryOwnerAddress,
      status: recoveryOwnerConstants.authorizingStatus
    });

    if (resp.isFailure()) {
      // TODO: Have to change this error
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_r_ro_1',
          api_error_identifier: 'another_recovery_operation_in_process',
          debug_options: {}
        })
      );
    }

    let recOperation = await new RecoveryOperationModelKlass()
      .insert({
        token_id: oThis.tokenId,
        user_id: oThis.userId,
        kind: recoveryOperationConstants.invertedKinds[recoveryOperationConstants.pinResetByUserKind],
        status: recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.inProgressStatus]
      })
      .fire();

    console.log('Operation inserted ************** ', recOperation);
    // Start Reset Recovery owner workflow
    await oThis._startResetRecoveryOwnerWorkflow(recOperation.insertId);
  }

  async _startResetRecoveryOwnerWorkflow(recoveryOperationId) {
    const oThis = this;

    const requestParams = {
        auxChainId: oThis.auxChainId,
        tokenId: oThis.tokenId,
        userId: oThis.userId,
        oldRecoveryOwnerAddress: oThis.userData.recoveryOwnerAddress,
        newRecoveryOwnerAddress: oThis.newRecoveryOwnerAddress,
        signature: oThis.signature,
        recoveryOwnerShardNumber: oThis.userData.recoveryOwnerShardNumber,
        recoveryAddress: oThis.recoveryContractAddress,
        recoveryOperationId: recoveryOperationId
      },
      initParams = {
        stepKind: workflowStepConstants.resetRecoveryOwnerInit,
        taskStatus: workflowStepConstants.taskReadyToStart,
        clientId: oThis.clientId,
        chainId: oThis.auxChainId,
        topic: workflowTopicConstants.resetRecoveryOwner,
        requestParams: requestParams
      };

    const resetRecoveryOwnerRouterObj = new ResetRecoveryOwnerRouter(initParams);

    let response = await resetRecoveryOwnerRouterObj.perform();

    if (response.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_r_ir_5',
          api_error_identifier: 'action_not_performed_contact_support',
          debug_options: {}
        })
      );
    }
  }
}

InstanceComposer.registerAsShadowableClass(ResetOwner, coreConstants.icNameSpace, 'ResetUserRecoveryOwner');

module.exports = {};
