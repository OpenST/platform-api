/**
 * Module to revoke device multi sig operation.
 *
 * @module app/services/device/multisigOperation/RevokeDevice
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  WorkflowModelKlass = require(rootPrefix + '/app/models/mysql/Workflow'),
  Base = require(rootPrefix + '/app/services/device/multisigOperation/Base'),
  RevokeDeviceRouter = require(rootPrefix + '/lib/workflow/revokeDevice/Router'),
  UserRecoveryOperationsCache = require(rootPrefix + '/lib/cacheManagement/shared/UserPendingRecoveryOperations'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  workflowTopicConstants = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  webhookSubscriptionsConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/cacheManagement/chainMulti/DeviceDetail');
require(rootPrefix + '/lib/device/UpdateStatus');
require(rootPrefix + '/lib/cacheManagement/chain/PreviousOwnersMap');

/**
 * Class to revoke device multi sig operation.
 *
 * @class RevokeDevice
 */
class RevokeDevice extends Base {
  /**
   * Constructor to revoke device multi sig operation.
   *
   * @param {object} params
   * @param {object} params.raw_calldata
   * @param {string} params.raw_calldata.method: possible value removeOwner
   * @param {array} params.raw_calldata.parameters
   * @param {string} params.raw_calldata.parameters[0]: previous device address (linked address)
   * @param {string} params.raw_calldata.parameters[1]: old device address
   * @param {string/number} params.raw_calldata.parameters[2]: requirement/threshold
   *
   * @augments Base
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.rawCalldata = params.raw_calldata;

    oThis.previousDeviceAddress = null;
    oThis.deviceAddressToRemove = null;
  }

  /**
   * Sanitize action specific params.
   *
   * @sets oThis.previousDeviceAddress, oThis.deviceAddressToRemove
   *
   * @returns {Promise<never>}
   * @private
   */
  async _sanitizeSpecificParams() {
    const oThis = this;

    oThis.rawCalldata = await basicHelper.sanitizeRawCallData(oThis.rawCalldata);

    if (!CommonValidators.validateRawCallData(oThis.rawCalldata)) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_dm_mo_rd_1',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_raw_calldata'],
          debug_options: {}
        })
      );
    }

    const rawCallDataMethod = oThis.rawCalldata.method;
    if (rawCallDataMethod !== 'removeOwner') {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_dm_mo_rd_2',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_raw_calldata_method'],
          debug_options: {}
        })
      );
    }

    const rawCallDataParameters = oThis.rawCalldata.parameters;
    if (
      !(rawCallDataParameters instanceof Array) ||
      !CommonValidators.validateEthAddress(rawCallDataParameters[0]) ||
      !CommonValidators.validateEthAddress(rawCallDataParameters[1])
    ) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_dm_mo_rd_3',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_raw_calldata_parameter_address'],
          debug_options: {}
        })
      );
    }

    if (Number(rawCallDataParameters[2]) !== 1) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_dm_mo_rd_4',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_raw_calldata_parameter_threshold'],
          debug_options: {}
        })
      );
    }
    oThis.previousDeviceAddress = basicHelper.sanitizeAddress(rawCallDataParameters[0]);
    oThis.deviceAddressToRemove = basicHelper.sanitizeAddress(rawCallDataParameters[1]);
  }

  /**
   * Performs action specific pre checks
   *
   * @returns {Promise<void>}
   * @private
   */
  async _performSpecificPreChecks() {
    const oThis = this;

    if (oThis.deviceAddressToRemove === oThis.signer) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_dm_mo_rd_10',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_device_address_to_remove'],
          debug_options: {}
        })
      );
    }

    const deviceDetailsRsp = await oThis._fetchDeviceDetails([oThis.deviceAddressToRemove, oThis.signer]);

    const deviceAddressDetails = deviceDetailsRsp.data[oThis.deviceAddressToRemove],
      signerAddressDetails = deviceDetailsRsp.data[oThis.signer];

    if (
      basicHelper.isEmptyObject(signerAddressDetails) ||
      signerAddressDetails.status !== deviceConstants.authorizedStatus
    ) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_dm_mo_rd_5',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['unauthorized_signer'],
          debug_options: {}
        })
      );
    }

    if (
      basicHelper.isEmptyObject(deviceAddressDetails) ||
      deviceAddressDetails.status !== deviceConstants.authorizedStatus
    ) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_dm_mo_rd_6',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['unauthorized_device_address'],
          debug_options: {}
        })
      );
    }

    const previousDeviceAddress = await oThis._fetchLinkedDeviceAddress();

    if (previousDeviceAddress !== oThis.previousDeviceAddress) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_dm_mo_rd_7',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['unauthorized_device_address'],
          debug_options: {}
        })
      );
    }

    await oThis._validatePendingRecoveryOfDeviceUser();

    return responseHelper.successWithData({});
  }

  /**
   * Fetch linked address of given device address.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchLinkedDeviceAddress() {
    const oThis = this;

    const PreviousOwnersMapCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'PreviousOwnersMap'),
      previousOwnersMapObj = new PreviousOwnersMapCache({ userId: oThis.userId, tokenId: oThis.tokenId }),
      previousOwnersMapRsp = await previousOwnersMapObj.fetch();

    if (previousOwnersMapRsp.isFailure()) {
      logger.error('Error in fetching linked addresses');

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_dm_mo_rd_8',
          api_error_identifier: 'cache_issue',
          debug_options: {}
        })
      );
    }

    return previousOwnersMapRsp.data[oThis.deviceAddressToRemove];
  }

  /**
   * Validate Device address is part of some pending recovery operation of user.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _validatePendingRecoveryOfDeviceUser() {
    const oThis = this;

    const recoveryOperationsResp = await new UserRecoveryOperationsCache({
        tokenId: oThis.tokenId,
        userId: oThis.userId
      }).fetch(),
      recoveryOperations = recoveryOperationsResp.data.recoveryOperations || [];

    // There are pending recovery operations of user, so check for devices involved
    if (recoveryOperations.length > 0) {
      const workflowIds = [];
      for (const index in recoveryOperations) {
        const operation = recoveryOperations[index];
        workflowIds.push(operation.workflow_id);
      }
      // Fetch workflow details of pending operations
      const pendingWorkflowDetails = await new WorkflowModelKlass()
        .select('*')
        .where(['id IN (?)', workflowIds])
        .fire();

      for (const index in pendingWorkflowDetails) {
        const workflow = pendingWorkflowDetails[index],
          recoveryParams = JSON.parse(workflow.request_params);
        // Check if addresses involved in recovery operation matches with device address which needs to be revoked.
        if (
          [recoveryParams.oldDeviceAddress, recoveryParams.oldLinkedAddress, recoveryParams.newDeviceAddress].includes(
            oThis.deviceAddressToRemove
          )
        ) {
          logger.error(
            'Device ',
            oThis.deviceAddressToRemove,
            ' involved in recovery operation workflow ',
            workflow.id
          );

          return Promise.reject(
            responseHelper.paramValidationError({
              internal_error_identifier: 'a_s_dm_mo_rd_9',
              api_error_identifier: 'invalid_api_params',
              params_error_identifiers: ['device_involved_in_recovery_operation'],
              debug_options: {}
            })
          );
        }
      }
    }
  }

  /**
   * Perform operation.
   *
   * @returns {Promise<any>}
   * @private
   */
  async _performOperation() {
    const oThis = this;

    const updateResponse = await oThis._updateDeviceStatus(
      oThis.deviceAddressToRemove,
      deviceConstants.authorizedStatus,
      deviceConstants.revokingStatus
    );

    await oThis._startWorkflow();

    await oThis._sendPreprocessorWebhook(
      webhookSubscriptionsConstants.devicesRevocationInitiateTopic,
      oThis.deviceAddressToRemove
    );

    return oThis._prepareResponseEntity(updateResponse);
  }

  /**
   * Starts the workflow to submit revoke device transaction.
   *
   * @returns {Promise}
   * @private
   */
  async _startWorkflow() {
    const oThis = this;

    logger.debug('****Starting the revoke workflow');

    const requestParams = {
        auxChainId: oThis._configStrategyObject.auxChainId,
        clientId: oThis.clientId,
        tokenId: oThis.tokenId,
        userId: oThis.userId,
        deviceAddressToRemove: oThis.deviceAddressToRemove,
        to: oThis.to,
        value: oThis.value,
        calldata: oThis.calldata,
        rawCalldata: oThis.rawCalldata,
        operation: oThis.operation,
        safeTxGas: oThis.safeTxGas,
        dataGas: oThis.dataGas,
        gasPrice: oThis.gasPrice,
        gasToken: oThis.gasToken,
        refundReceiver: oThis.refundReceiver,
        signatures: oThis.signatures,
        signer: oThis.signer,
        chainEndpoint: oThis._configStrategyObject.auxChainWsProvider(configStrategyConstants.gethReadWrite),
        deviceShardNumber: oThis.deviceShardNumber,
        multisigAddress: oThis.multisigAddress,
        deviceNonce: oThis.nonce
      },
      revokeDeviceInitParams = {
        stepKind: workflowStepConstants.revokeDeviceInit,
        taskStatus: workflowStepConstants.taskReadyToStart,
        clientId: oThis.clientId,
        chainId: oThis._configStrategyObject.auxChainId,
        topic: workflowTopicConstants.revokeDevice,
        requestParams: requestParams
      };

    const revokeDeviceObj = new RevokeDeviceRouter(revokeDeviceInitParams);

    return revokeDeviceObj.perform();
  }

  /**
   * Prepares the response for device multisig operation service.
   *
   * @returns {Promise<any>}
   * @private
   */
  async _prepareResponseEntity(updateResponseData) {
    const oThis = this;

    logger.debug('****Preparing revoke device service response');

    const responseHash = updateResponseData.data;

    responseHash.linkedAddress = oThis.previousDeviceAddress;

    return responseHelper.successWithData({
      [resultType.device]: responseHash
    });
  }
}

InstanceComposer.registerAsShadowableClass(RevokeDevice, coreConstants.icNameSpace, 'RevokeDevice');
