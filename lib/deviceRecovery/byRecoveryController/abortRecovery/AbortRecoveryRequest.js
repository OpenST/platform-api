/**
 * This class helps in aborting recovery request.
 *
 * @module lib/deviceRecovery/byRecoveryController/abortRecovery/ProcessRecoveryRequest
 */
const rootPrefix = '../../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  DeviceRecoveryBase = require(rootPrefix + '/lib/deviceRecovery/Base'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  workflowTopicConstants = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  RecoveryOperationModel = require(rootPrefix + '/app/models/mysql/RecoveryOperation'),
  recoveryOperationConstants = require(rootPrefix + '/lib/globalConstant/recoveryOperation'),
  AbortRecoveryRouter = require(rootPrefix + '/lib/workflow/deviceRecovery/byRecoveryController/abortRecovery/Router');

/**
 * Class to abort recovery request.
 *
 * @class
 */
class AbortRecoveryRequest extends DeviceRecoveryBase {
  /**
   * Constructor for aborting recovery request.
   *
   * @param {String} [params.userId]
   * @param {String/Number} [params.initiateRecoveryOperationId]
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
   * Main Perform
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
   * @param recoveryOperationId
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
