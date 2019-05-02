/**
 * Module to initiate recovery procedure for user.
 *
 * @module app/services/user/recovery/Initiate
 */

const OpenStJs = require('@openst/openst.js'),
  OSTBase = require('@ostdotcom/base');

const rootPrefix = '../../../..',
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  UserRecoveryServiceBase = require(rootPrefix + '/app/services/user/recovery/Base'),
  RecoveryOperationModel = require(rootPrefix + '/app/models/mysql/RecoveryOperation'),
  InitRecoveryRouter = require(rootPrefix + '/lib/workflow/deviceRecovery/byOwner/initiateRecovery/Router'),
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
 * Class to initiate recovery procedure for user.
 *
 * @class InitiateRecovery
 */
class InitiateRecovery extends UserRecoveryServiceBase {
  /**
   * Constructor to initiate recovery procedure for user.
   *
   * @param {object} params
   * @param {number} params.client_id
   * @param {number} params.token_id
   * @param {string} params.user_id
   * @param {string} params.old_linked_address
   * @param {string} params.old_device_address
   * @param {string} params.new_device_address
   * @param {string} params.to: Transaction to address, user recovery proxy address
   * @param {string} params.signature: Packed signature data ({bytes32 r}{bytes32 s}{uint8 v})
   * @param {string} params.signer: recovery owner address who signed this transaction
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

    // Check for same old and new device addresses.
    if (oThis.oldDeviceAddress === oThis.newDeviceAddress) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_u_r_ir_1',
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
   * @private
   */
  _createTypedData() {
    const oThis = this,
      recoveryHelperObj = new RecoveryHelper(oThis._web3Instance, oThis.recoveryContractAddress);

    return recoveryHelperObj.getInitiateRecoveryData(
      oThis.oldLinkedAddress,
      oThis.oldDeviceAddress,
      oThis.newDeviceAddress
    );
  }

  /**
   * Check if recovery operation can be performed or not.
   *
   * @returns {Promise<Void>}
   * @private
   */
  async _canPerformRecoveryOperation() {
    const oThis = this;

    for (const index in oThis.userPendingRecoveryOperations) {
      const operation = oThis.userPendingRecoveryOperations[index];

      // Another in progress operation is present.
      if (
        operation.status == recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.inProgressStatus]
      ) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'a_s_u_r_ir_2',
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
            internal_error_identifier: 'a_s_u_r_ir_3',
            api_error_identifier: 'initiate_recovery_is_pending',
            debug_options: {}
          })
        );
      }
    }
  }

  /**
   * Validate input addresses with devices statuses.
   *
   * @returns {Promise<never>}
   * @private
   */
  async _validateAddressStatuses() {
    const oThis = this;

    const devicesCacheResponse = await oThis._fetchDevices();

    // Check if old device address is found or not and its status is authorized or not.
    if (
      !CommonValidators.validateObject(devicesCacheResponse[oThis.oldDeviceAddress]) ||
      devicesCacheResponse[oThis.oldDeviceAddress].status !== deviceConstants.authorizedStatus
    ) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_u_r_ir_4',
          api_error_identifier: 'invalid_params',
          params_error_identifiers: ['invalid_old_device_address'],
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
          internal_error_identifier: 'a_s_u_r_ir_5',
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
   * @sets oThis.newDeviceAddressEntity
   *
   * @returns {Promise<never>}
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

    const recOperation = await new RecoveryOperationModel().insertOperation({
      token_id: oThis.tokenId,
      user_id: oThis.userId,
      kind: recoveryOperationConstants.invertedKinds[recoveryOperationConstants.initiateRecoveryByUserKind],
      status: recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.inProgressStatus]
    });

    // Start Initiate Recovery workflow
    await oThis._startInitiateRecoveryWorkflow(recOperation.insertId);
  }

  /**
   * Start initiate recovery workflow.
   *
   * @param {string/number} recoveryOperationId
   *
   * @return {Promise<never>}
   * @private
   */
  async _startInitiateRecoveryWorkflow(recoveryOperationId) {
    const oThis = this;

    const requestParams = {
        auxChainId: oThis.auxChainId,
        tokenId: oThis.tokenId,
        userId: oThis.userId,
        clientId: oThis.clientId,
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
          internal_error_identifier: 'a_s_u_r_ir_6',
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

InstanceComposer.registerAsShadowableClass(InitiateRecovery, coreConstants.icNameSpace, 'InitiateRecovery');

module.exports = {};
