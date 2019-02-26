/**
 * This service initiates recovery procedure for user.
 *
 * @module app/services/user/recovery/InitiateRecovery
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  workflowTopicConstants = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  UserRecoveryServiceBase = require(rootPrefix + '/app/services/user/recovery/Base'),
  RecoveryOperationModelKlass = require(rootPrefix + '/app/models/mysql/RecoveryOperation'),
  recoveryOperationConstants = require(rootPrefix + '/lib/globalConstant/recoveryOperation'),
  InitRecoveryRouter = require(rootPrefix + '/lib/workflow/deviceRecovery/byOwner/initiateRecovery/Router');

/**
 * Class to initiate recovery procedure for user.
 *
 * @class InitiateRecovery
 */
class InitiateRecovery extends UserRecoveryServiceBase {
  /**
   * Constructor to initiate recovery procedure for user.
   *
   * @param {Object} params
   * @param {Number} params.client_id
   * @param {Number} params.token_id
   * @param {String} params.user_id
   * @param {String} params.old_linked_address
   * @param {String} params.old_device_address
   * @param {String} params.new_device_address
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
          internal_error_identifier: 'a_s_u_r_b_5',
          api_error_identifier: 'invalid_params',
          params_error_identifiers: ['same_new_and_old_device_addresses'],
          debug_options: {}
        })
      );
    }

    await oThis._validateOldLinkedAddress();
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

    // Fetch all recovery operations of user.
    const recoveryOperationObj = new RecoveryOperationModelKlass(),
      recoveryOperations = await recoveryOperationObj.getPendingOperationsOfTokenUser(oThis.tokenId, oThis.userId);

    for (let index in recoveryOperations) {
      const operation = recoveryOperations[index];

      // Another in progress operation is present.
      if (
        operation.status == recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.inProgressStatus]
      ) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'a_s_u_r_ir_1',
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
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'a_s_u_r_ir_2',
            api_error_identifier: 'initiate_recovery_is_pending',
            debug_options: {}
          })
        );
      }
    }
  }

  /**
   * Validate devices from cache.
   *
   * @returns {Promise<never>}
   *
   * @private
   */
  async _validateDevices() {
    const oThis = this;

    const devicesCacheResponse = await oThis._fetchDevices();

    // Check if old device address is found or not and its status is authorized or not.
    if (
      !CommonValidators.validateObject(devicesCacheResponse[oThis.oldDeviceAddress]) ||
      devicesCacheResponse[oThis.oldDeviceAddress].status !== deviceConstants.authorizedStatus
    ) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_u_r_ir_3',
          api_error_identifier: 'invalid_params',
          params_error_identifiers: ['old_device_address_not_authorized'],
          debug_options: {}
        })
      );
    }

    // Check if new device address is found or not and its status is registered or not.
    if (
      !CommonValidators.validateObject(devicesCacheResponse[oThis.newDeviceAddress]) ||
      devicesCacheResponse[oThis.newDeviceAddress].status !== deviceConstants.registeredStatus
    ) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_u_r_ir_4',
          api_error_identifier: 'invalid_params',
          params_error_identifiers: ['new_device_address_not_registered'],
          debug_options: {}
        })
      );
    }
  }

  /**
   * Initiate recovery for user.
   *
   * @sets oThis.newDeviceAddressEntity
   *
   * @returns {Promise<never>}
   *
   * @private
   */
  async _performRecoveryOperation() {
    const oThis = this;

    // Change old device from authorized to Revoking
    // New device from Registered to Authorizing
    const statusMap = {
      [oThis.oldDeviceAddress]: {
        initial: deviceConstants.authorizedStatus,
        final: deviceConstants.revokingStatus
      },
      [oThis.newDeviceAddress]: {
        initial: deviceConstants.registeredStatus,
        final: deviceConstants.recoveringStatus
      }
    };
    const devicesInfo = await oThis._changeDeviceStatuses(statusMap);

    for (let index = 0; index < devicesInfo.length; index++) {
      if (devicesInfo[index].walletAddress === oThis.newDeviceAddress) {
        oThis.newDeviceAddressEntity = devicesInfo[index];
      }
    }

    const recOperation = await new RecoveryOperationModelKlass()
      .insert({
        token_id: oThis.tokenId,
        user_id: oThis.userId,
        kind: recoveryOperationConstants.invertedKinds[recoveryOperationConstants.initiateRecoveryByUserKind],
        status: recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.inProgressStatus]
      })
      .fire();

    // Start Initiate Recovery workflow
    await oThis._startInitiateRecoveryWorkflow(recOperation.insertId);
  }

  /**
   * Start initiate recovery workflow.
   *
   * @param {String/Number} recoveryOperationId
   *
   * @return {Promise<never>}
   *
   * @private
   */
  async _startInitiateRecoveryWorkflow(recoveryOperationId) {
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
        recoveryOperationId: recoveryOperationId
      },
      initParams = {
        stepKind: workflowStepConstants.initiateRecoveryInit,
        taskStatus: workflowStepConstants.taskReadyToStart,
        clientId: oThis.clientId,
        chainId: oThis.auxChainId,
        topic: workflowTopicConstants.initiateRecovery,
        requestParams: requestParams
      };

    const initRecoveryObj = new InitRecoveryRouter(initParams),
      response = await initRecoveryObj.perform();

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

InstanceComposer.registerAsShadowableClass(InitiateRecovery, coreConstants.icNameSpace, 'InitiateRecovery');

module.exports = {};
