/**
 * Module to abort recovery request by recovery controller.
 *
 * @module lib/deviceRecovery/byRecoveryController/abortRecovery/ProcessRecoveryRequest
 */

const rootPrefix = '../../../..',
  DeviceRecoveryBase = require(rootPrefix + '/lib/deviceRecovery/Base'),
  RecoveryOperationModel = require(rootPrefix + '/app/models/mysql/RecoveryOperation'),
  AbortRecoveryRouter = require(rootPrefix + '/lib/workflow/deviceRecovery/byRecoveryController/abortRecovery/Router'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  workflowTopicConstants = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  recoveryOperationConstants = require(rootPrefix + '/lib/globalConstant/recoveryOperation');

/**
 * Class to abort recovery request by recovery controller.
 *
 * @class AbortRecoveryRequest
 */
class AbortRecoveryRequest extends DeviceRecoveryBase {
  /**
   * Constructor to abort recovery request by recovery controller.
   *
   * @param {string} [params.userId]
   * @param {string/number} [params.initiateRecoveryOperationId]
   *
   * @augments DeviceRecoveryBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.initiateRecoveryOperation = null;
    oThis.initiateRecoveryWorkflow = null;
  }

  /**
   * Main performer of class.
   *
   * @returns {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis._validateInitiateRecoveryOperation();

    const recOperation = await new RecoveryOperationModel().insertOperation({
      token_id: oThis.initiateRecoveryOperation.token_id,
      user_id: oThis.userId,
      kind: recoveryOperationConstants.invertedKinds[recoveryOperationConstants.abortRecoveryByControllerKind],
      status: recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.inProgressStatus]
    });

    await oThis._startWorkflow(recOperation.insertId);
  }

  /**
   * Start execute recovery workflow.
   *
   * @param {number/string} recoveryOperationId
   *
   * @returns {Promise<Void>}
   * @private
   */
  async _startWorkflow(recoveryOperationId) {
    const oThis = this;

    const initRecoveryParams = JSON.parse(oThis.initiateRecoveryWorkflow.request_params);

    const requestParams = {
        auxChainId: initRecoveryParams.auxChainId,
        tokenId: initRecoveryParams.tokenId,
        userId: initRecoveryParams.userId,
        oldLinkedAddress: initRecoveryParams.oldLinkedAddress,
        oldDeviceAddress: initRecoveryParams.oldDeviceAddress,
        newDeviceAddress: initRecoveryParams.newDeviceAddress,
        deviceShardNumber: initRecoveryParams.deviceShardNumber,
        recoveryAddress: initRecoveryParams.recoveryAddress,
        initiateRecoveryOperationId: initRecoveryParams.recoveryOperationId,
        recoveryOperationId: recoveryOperationId
      },
      initParams = {
        stepKind: workflowStepConstants.abortRecoveryByRecoveryControllerInit,
        taskStatus: workflowStepConstants.taskReadyToStart,
        clientId: oThis.initiateRecoveryWorkflow.client_id,
        chainId: initRecoveryParams.auxChainId,
        topic: workflowTopicConstants.abortRecoveryByRecoveryController,
        requestParams: requestParams
      };

    const abortRecoveryObj = new AbortRecoveryRouter(initParams),
      response = await abortRecoveryObj.perform();

    if (response.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_dr_brc_er_prr_1',
          api_error_identifier: 'action_not_performed_contact_support',
          debug_options: {}
        })
      );
    }
  }
}

module.exports = AbortRecoveryRequest;
