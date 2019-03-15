'use strict';
/**
 * This service abort existing recovery procedure for user.
 *
 * @module app/services/user/recovery/Abort
 */

const OpenStJs = require('@openstfoundation/openst.js'),
  OSTBase = require('@ostdotcom/base');

const rootPrefix = '../../../..',
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  UserRecoveryServiceBase = require(rootPrefix + '/app/services/user/recovery/Base'),
  RecoveryOperationModel = require(rootPrefix + '/app/models/mysql/RecoveryOperation'),
  AbortRecoveryRouter = require(rootPrefix + '/lib/workflow/deviceRecovery/byOwner/abortRecovery/Router'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  workflowTopicConstants = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  recoveryOperationConstants = require(rootPrefix + '/lib/globalConstant/recoveryOperation');

const RecoveryHelper = OpenStJs.Helpers.Recovery,
  InstanceComposer = OSTBase.InstanceComposer;
/**
 * Class to abort existing recovery procedure for user.
 *
 * @class AbortRecovery
 */
class AbortRecovery extends UserRecoveryServiceBase {
  /**
   * Constructor to abort existing recovery procedure for user.
   *
   * @param {Object} params
   * @param {Number} params.client_id
   * @param {Number} params.token_id
   * @param {String} params.user_id
   * @param {String} params.old_linked_address
   * @param {String} params.old_device_address
   * @param {String} params.new_device_address
   * @param {String} params.to: Transaction to address, user recovery proxy address
   * @param {String} params.signature: Packed signature data ({bytes32 r}{bytes32 s}{uint8 v})
   * @param {String} params.signer: recovery owner address who signed this transaction
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.initiateRecoveryOperationId = null;
  }

  /**
   * Perform basic validations on user data before recovery procedures.
   *
   * @returns {Promise<Void>}
   *
   * @private
   */
  async _basicValidations() {
    const oThis = this;

    await super._basicValidations();

    // Check for same old and new device addresses
    if (oThis.oldDeviceAddress === oThis.newDeviceAddress) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_u_r_ar_1',
          api_error_identifier: 'invalid_params',
          params_error_identifiers: ['same_new_and_old_device_addresses'],
          debug_options: {}
        })
      );
    }

    await oThis._validateOldLinkedAddress();
  }

  /**
   * Get typed data.
   *
   * @return {TypedData}
   *
   * @private
   */
  _createTypedData() {
    const oThis = this,
      recoveryHelperObj = new RecoveryHelper(oThis._web3Instance, oThis.recoveryContractAddress);

    return recoveryHelperObj.abortRecoveryData(oThis.oldLinkedAddress, oThis.oldDeviceAddress, oThis.newDeviceAddress);
  }

  /**
   * Check if recovery operation can be performed or not.
   *
   * @returns {Promise<Void>}
   *
   * @private
   */
  async _canPerformRecoveryOperation() {
    const oThis = this;

    // Fetch all recovery operations of user
    const recoveryOperationObj = new RecoveryOperationModel(),
      recoveryOperations = await recoveryOperationObj.getPendingOperationsOfTokenUser(oThis.tokenId, oThis.userId);

    for (let index in recoveryOperations) {
      const operation = recoveryOperations[index];

      // Another in progress operation is present.
      if (
        operation.status == recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.inProgressStatus]
      ) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'a_s_u_r_ar_2',
            api_error_identifier: 'another_recovery_operation_in_process',
            debug_options: {}
          })
        );
      }

      // Another in progress operation is present.
      if (
        operation.status ==
        recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.waitingForAdminActionStatus]
      ) {
        oThis.initiateRecoveryOperationId = operation.id;
      }
    }

    // If there is no pending initiate request then give error.
    if (!oThis.initiateRecoveryOperationId) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_r_ar_3',
          api_error_identifier: 'initiate_recovery_request_not_present',
          debug_options: {}
        })
      );
    }
  }

  /**
   * Validate input addresses with device statuses
   *
   * @sets oThis.newDeviceAddressEntity
   *
   * @returns {Promise<never>}
   *
   * @private
   */
  async _validateAddressStatuses() {
    const oThis = this;

    const devicesCacheResponse = await oThis._fetchDevices();

    oThis.newDeviceAddressEntity = devicesCacheResponse[oThis.newDeviceAddress];

    // Check if old device address is found or not and its status is revoking or not.
    if (
      !CommonValidators.validateObject(devicesCacheResponse[oThis.oldDeviceAddress]) ||
      devicesCacheResponse[oThis.oldDeviceAddress].status !== deviceConstants.revokingStatus
    ) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_u_r_ar_4',
          api_error_identifier: 'invalid_params',
          params_error_identifiers: ['invalid_old_device_address'],
          debug_options: {}
        })
      );
    }

    // Check if new device address is found or not and its status is recovering or not.
    if (
      !CommonValidators.validateObject(devicesCacheResponse[oThis.newDeviceAddress]) ||
      devicesCacheResponse[oThis.newDeviceAddress].status !== deviceConstants.recoveringStatus
    ) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_u_r_ar_5',
          api_error_identifier: 'invalid_params',
          params_error_identifiers: ['invalid_new_device_address'],
          debug_options: {}
        })
      );
    }
  }

  /**
   * Initiate recovery for user.
   *
   * @returns {Promise<never>}
   *
   * @private
   */
  async _performRecoveryOperation() {
    const oThis = this;

    const recOperation = await new RecoveryOperationModel()
      .insert({
        token_id: oThis.tokenId,
        user_id: oThis.userId,
        kind: recoveryOperationConstants.invertedKinds[recoveryOperationConstants.abortRecoveryByUserKind],
        status: recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.inProgressStatus]
      })
      .fire();

    // Start Abort Recovery workflow
    await oThis._startAbortRecoveryWorkflow(recOperation.insertId);
  }

  /**
   * Start abort recovery workflow.
   *
   * @param {String/Number} recoveryOperationId
   *
   * @return {Promise<never>}
   *
   * @private
   */
  async _startAbortRecoveryWorkflow(recoveryOperationId) {
    const oThis = this;

    const requestParams = {
        auxChainId: oThis.auxChainId,
        tokenId: oThis.tokenId,
        userId: oThis.userId,
        oldLinkedAddress: oThis.oldLinkedAddress,
        oldDeviceAddress: oThis.oldDeviceAddress,
        newDeviceAddress: oThis.newDeviceAddress,
        signature: oThis.signature,
        deviceShardNumber: oThis.deviceShardNumber,
        recoveryAddress: oThis.recoveryContractAddress,
        recoveryOperationId: recoveryOperationId,
        initiateRecoveryOperationId: oThis.initiateRecoveryOperationId
      },
      initParams = {
        stepKind: workflowStepConstants.abortRecoveryByOwnerInit,
        taskStatus: workflowStepConstants.taskReadyToStart,
        clientId: oThis.clientId,
        chainId: oThis.auxChainId,
        topic: workflowTopicConstants.abortRecoveryByOwner,
        requestParams: requestParams
      };

    const abortRecoveryObj = new AbortRecoveryRouter(initParams),
      response = await abortRecoveryObj.perform();

    if (response.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_r_ar_6',
          api_error_identifier: 'action_not_performed_contact_support',
          debug_options: {}
        })
      );
    }
  }

  /**
   * Return device entity.
   *
   * @returns {Promise<>}
   *
   * @private
   */
  async _returnResponse() {
    const oThis = this;

    return Promise.resolve(
      responseHelper.successWithData({
        [resultType.device]: oThis.newDeviceAddressEntity
      })
    );
  }
}

InstanceComposer.registerAsShadowableClass(AbortRecovery, coreConstants.icNameSpace, 'AbortRecovery');

module.exports = {};
