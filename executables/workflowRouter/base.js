'use strict';
/**
 * Base class for workflow router.
 *
 * @module executables/workflowRouter/Base
 */
const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  WorkflowModel = require(rootPrefix + '/app/models/mysql/Workflow'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  WorkflowStepsModel = require(rootPrefix + '/app/models/mysql/WorkflowStep'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  sharedRabbitMqProvider = require(rootPrefix + '/lib/providers/sharedNotification'),
  connectionTimeoutConst = require(rootPrefix + '/lib/globalConstant/connectionTimeout'),
  WorkflowStatusCache = require(rootPrefix + '/lib/sharedCacheManagement/WorkflowStatus'),
  WorkflowStepsStatusCache = require(rootPrefix + '/lib/sharedCacheManagement/WorkflowStepsStatus');

/**
 * Class for workflow router base.
 *
 * @class
 */
class WorkflowRouterBase {
  /**
   * Constructor for workflow router base.
   *
   * @param {Object} params
   * @param {Number} params.currentStepId  id of process parent
   * @param {Number} params.workflowId id of process parent
   * @param {String} params.stepKind Which step to execute in router
   * @param {String} params.topic
   * @param {String} params.workflowKind Kind of workflow
   * @param {String} params.taskStatus task is 'taskReadyToStart' or 'taskDone' or 'taskFailed' status.
   * @param {Object} params.taskResponseData when task is 'taskDone', send taskResponseData if required.
   * @param {Number} params.clientId
   * @param {Number} params.groupId
   * @param {Object} params.payload
   * @param {Object} params.requestParams
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;
    oThis.currentStepId = params.currentStepId;
    oThis.workflowId = params.workflowId;
    oThis.topic = params.topic;
    oThis.workflowKind = params.workflowKind;
    oThis.chainId = params.chainId;

    oThis.stepKind = params.stepKind;
    oThis.taskStatus = params.taskStatus;
    oThis.taskResponseData = params.taskResponseData;

    oThis.clientId = params.clientId;
    oThis.chainId = params.chainId;
    oThis.groupId = params.groupId;

    oThis.requestParams = params.requestParams || {};

    oThis.taskDone = false;
    oThis.stepsToBePerformedOnSuccess = [];
    oThis.stepsToBePerformedOnFailure = [];
    oThis.workFlow = null;
    oThis.nextSteps = [];
    oThis.workflowStepKindToRecordMap = {};
    oThis.currentStepDataToBeUpdated = {};
    oThis.transactionHash = null;
    oThis.currentStepConfig = null;
  }

  /**
   * Performer
   *
   * @returns {Promise<>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(async function(error) {
      if (responseHelper.isCustomResult(error)) {
        logger.error(error.getDebugData());
        await oThis._handleCaughtErrors(JSON.stringify(error.getDebugData()));
        return error;
      } else {
        logger.error('executables/workflowRouter/Base::perform::catch');
        logger.error(error);
        await oThis._handleCaughtErrors();
        return responseHelper.error({
          internal_error_identifier: 'e_wr_b_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * Async performer
   *
   * @returns {Promise<>}
   */
  async asyncPerform() {
    const oThis = this;

    oThis._fetchCurrentStepConfig();

    await oThis._validateConfig();

    await oThis._getWorkFlow();

    await oThis._getWorkFlowSteps();

    await oThis._validateAndSanitize();

    oThis._clubRequestParamsFromDependencies();

    await oThis._decideChainId();

    await oThis._performStepIfReadyToStart();

    oThis._prepareDataToBeUpdated();

    await oThis._updateCurrentStep();

    oThis._prepareForNextSteps();

    await oThis._insertAndPublishForNextSteps();

    await oThis._clearWorkflowStatusCache(oThis.workflowId);

    await oThis._clearWorkflowStepsStatusCache(oThis.workflowId);

    return Promise.resolve(responseHelper.successWithData({ workflow_id: oThis.workflowId }));
  }

  /**
   * Fetch current step config for every router.
   *
   * @private
   */
  _fetchCurrentStepConfig() {
    throw 'sub-class to implement';
  }

  /**
   * Validate step config.
   *
   * @returns {Promise<>}
   *
   * @sets oThis.stepsToBePerformedOnSuccess, oThis.stepsToBePerformedOnFailure
   *
   * @private
   */
  async _validateConfig() {
    const oThis = this;

    if (!oThis.currentStepConfig) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_wr_b_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: { stepKind: oThis.stepKind }
        })
      );
    }

    oThis.stepsToBePerformedOnSuccess = oThis.currentStepConfig.onSuccess || [];

    if (oThis.currentStepConfig.onFailure && oThis.currentStepConfig.onFailure != '') {
      oThis.stepsToBePerformedOnFailure = [oThis.currentStepConfig.onFailure];
    }

    oThis.readDataFromSteps = oThis.currentStepConfig.readDataFrom || [];

    return responseHelper.successWithData({});
  }

  /**
   * Get workflow details from workflows table.
   *
   * @returns {Promise<any>}
   *
   * @sets oThis.workFlow, oThis.requestParams, oThis.clientId
   *
   * @private
   */
  async _getWorkFlow() {
    const oThis = this;

    if (!oThis.workflowId) return Promise.resolve();

    oThis.workFlow = (await new WorkflowModel()
      .select('*')
      .where(['id = (?)', oThis.workflowId])
      .fire())[0];

    if (!oThis.workFlow) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_wr_b_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: { workflowId: oThis.workflowId }
        })
      );
    }

    oThis.requestParams = JSON.parse(oThis.workFlow.request_params);
    oThis.clientId = oThis.workFlow.client_id;

    if (!oThis.clientId) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_wr_b_4',
          api_error_identifier: 'something_went_wrong',
          debug_options: { workflowId: oThis.workflowId }
        })
      );
    }
  }

  /**
   * Get workflow steps.
   *
   * @return {Promise<void>}
   *
   * @sets oThis.workflowStepKindToRecordMap
   *
   * @private
   */
  async _getWorkFlowSteps() {
    const oThis = this;

    if (!oThis.workflowId) return;

    let workflowRecords = await new WorkflowStepsModel()
      .select('*')
      .where(['workflow_id = (?) AND status IS NOT ?', oThis.workflowId, workflowStepConstants.retriedStatus])
      .fire();

    let stepKindsMap = new WorkflowStepsModel().kinds;

    for (let i = 0; i < workflowRecords.length; i++) {
      let step = workflowRecords[i];
      oThis.workflowStepKindToRecordMap[stepKindsMap[step.kind]] = step;
    }
  }

  /**
   * Validate and sanitize
   *
   * @returns {Promise<>}
   *
   * @sets oThis.requestParams, oThis.clientId
   *
   * @private
   */
  async _validateAndSanitize() {
    const oThis = this;

    let allowedTaskStatus =
      oThis.taskStatus == workflowStepConstants.taskDone ||
      oThis.taskStatus == workflowStepConstants.taskReadyToStart ||
      oThis.taskStatus == workflowStepConstants.taskFailed;

    if (!oThis.taskStatus || !allowedTaskStatus) {
      logger.error(
        'Unsupported Task status ' + oThis.taskStatus + ' inside executables/workflowRouter/testProcessRouter.js'
      );
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_wr_b_5',
          api_error_identifier: 'something_went_wrong',
          debug_options: { taskStatus: oThis.taskStatus }
        })
      );
    }

    let currentRecord = oThis.workflowStepKindToRecordMap[oThis.stepKind];

    if (oThis.workflowId) {
      let statusMap = new WorkflowStepsModel().invertedStatuses,
        isQueuedStatus = currentRecord.status == statusMap[workflowStepConstants.queuedStatus],
        isPendingStatus = currentRecord.status == statusMap[workflowStepConstants.pendingStatus],
        isToBeProcessedStatus = isPendingStatus || isQueuedStatus;

      // Check for parent and current records
      if (!isToBeProcessedStatus) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'e_wr_b_6',
            api_error_identifier: 'something_went_wrong',
            debug_options: { workflowId: oThis.workflowId }
          })
        );
      }
    }

    for (let stepKind in oThis.workflowStepKindToRecordMap) {
      let step = oThis.workflowStepKindToRecordMap[stepKind];

      if (step.response_data) {
        Object.assign(oThis.requestParams, JSON.parse(step.response_data));
      }
    }
  }

  /**
   * Club request params from all dependencies.
   *
   * @private
   */
  _clubRequestParamsFromDependencies() {
    const oThis = this;

    if (oThis.readDataFromSteps.length <= 0) return;

    for (let index = 0; index < oThis.readDataFromSteps.length; index++) {
      let dependencyKind = oThis.readDataFromSteps[index],
        step = oThis.workflowStepKindToRecordMap[dependencyKind];

      if (step.response_data) {
        Object.assign(oThis.requestParams, JSON.parse(step.response_data));
      }
    }
  }

  /**
   * Perform the steps if the current step is ready to start.
   *
   * @return {Promise<never>}
   *
   * @private
   */
  async _performStepIfReadyToStart() {
    const oThis = this;

    if (oThis.taskStatus != workflowStepConstants.taskReadyToStart) return;

    if (oThis.currentStepId) {
      await new WorkflowStepsModel().markAsPending(oThis.currentStepId);
    }
    await oThis._clearWorkflowStatusCache(oThis.workflowId);
    await oThis._clearWorkflowStepsStatusCache(oThis.workflowId);

    let response = await oThis._performStep();

    if (response.isFailure()) {
      logger.error('Error......', response);
      return Promise.reject(response);
    } else {
      oThis.taskStatus = response.data.taskStatus;
      oThis.taskResponseData = response.data.taskResponseData;
      oThis.transactionHash = response.data.transactionHash;
    }
  }

  /**
   * Prepare data to be updated in the table.
   *
   * @private
   */
  _prepareDataToBeUpdated() {
    const oThis = this;

    oThis.currentStepDataToBeUpdated.request_params = basicHelper.isEmptyObject(oThis.requestParams)
      ? null
      : JSON.stringify(oThis.requestParams);

    if (oThis.transactionHash) {
      oThis.currentStepDataToBeUpdated.transaction_hash = oThis.transactionHash;
    }

    if (oThis.taskResponseData) {
      oThis.currentStepDataToBeUpdated.response_data = JSON.stringify(oThis.taskResponseData);
    }

    if (oThis.taskStatus == workflowStepConstants.taskDone) {
      oThis.currentStepDataToBeUpdated.status = new WorkflowStepsModel().invertedStatuses[
        workflowStepConstants.processedStatus
      ];
    } else if (oThis.taskStatus == workflowStepConstants.taskFailed) {
      oThis.currentStepDataToBeUpdated.status = new WorkflowStepsModel().invertedStatuses[
        workflowStepConstants.failedStatus
      ];
    } else if (oThis.taskStatus == workflowStepConstants.taskPending) {
      oThis.currentStepDataToBeUpdated.status = new WorkflowStepsModel().invertedStatuses[
        workflowStepConstants.pendingStatus
      ];
    }
  }

  /**
   * Update details of current step in the table.
   *
   * @return {Promise<*>}
   *
   * @private
   */
  _updateCurrentStep() {
    const oThis = this;

    // Nothing to update.
    if (basicHelper.isEmptyObject(oThis.currentStepDataToBeUpdated) || !oThis.currentStepId) return Promise.resolve();

    return new WorkflowStepsModel().updateRecord(oThis.currentStepId, oThis.currentStepDataToBeUpdated);
  }

  /**
   * Decide chainId based on step being.
   *
   * @private
   */
  _decideChainId() {
    const oThis = this;
    switch (oThis.stepKind) {
      case workflowStepConstants.generateTokenAddresses:
      case workflowStepConstants.deployOriginTokenOrganization:
      case workflowStepConstants.saveOriginTokenOrganization:
      case workflowStepConstants.deployOriginBrandedToken:
      case workflowStepConstants.saveOriginBrandedToken:
      case workflowStepConstants.deployTokenGateway:
      case workflowStepConstants.saveTokenGateway:
      case workflowStepConstants.activateTokenGateway:
      case workflowStepConstants.verifyActivateTokenGateway:
      case workflowStepConstants.setGatewayInBt:
      case workflowStepConstants.verifySetGatewayInBt:
      case workflowStepConstants.deployGatewayComposer:
      case workflowStepConstants.verifyDeployGatewayComposer:
      case workflowStepConstants.stPrimeStakeAndMintInit:
      case workflowStepConstants.stPrimeApprove:
      case workflowStepConstants.simpleTokenStake:
      case workflowStepConstants.progressStake:
      case workflowStepConstants.checkApproveStatus:
      case workflowStepConstants.checkStakeStatus:
      case workflowStepConstants.checkProgressStakeStatus:
      case workflowStepConstants.fetchStakeIntentMessageHash:
      case workflowStepConstants.btStakeAndMintInit:
      case workflowStepConstants.btRequestStakeHandle:
      case workflowStepConstants.checkRequestStakeTxStatus:
      case workflowStepConstants.fetchStakeRequestHash:
      case workflowStepConstants.checkAllowance:
        oThis.chainId = oThis.requestParams.originChainId;
        break;

      case workflowStepConstants.deployAuxTokenOrganization:
      case workflowStepConstants.saveAuxTokenOrganization:
      case workflowStepConstants.deployUtilityBrandedToken:
      case workflowStepConstants.saveUtilityBrandedToken:
      case workflowStepConstants.deployTokenCoGateway:
      case workflowStepConstants.saveTokenCoGateway:
      case workflowStepConstants.updateTokenInOstView:
      case workflowStepConstants.setCoGatewayInUbt:
      case workflowStepConstants.verifySetCoGatewayInUbt:
      case workflowStepConstants.setInternalActorForOwnerInUBT:
      case workflowStepConstants.verifySetInternalActorForOwnerInUBT:
      case workflowStepConstants.proveGatewayOnCoGateway:
      case workflowStepConstants.confirmStakeIntent:
      case workflowStepConstants.progressMint:
      case workflowStepConstants.checkProveGatewayStatus:
      case workflowStepConstants.checkConfirmStakeStatus:
      case workflowStepConstants.checkProgressMintStatus:
      case workflowStepConstants.verifyEconomySetup:
        oThis.chainId = oThis.requestParams.auxChainId;
        break;

      case workflowStepConstants.commitStateRoot:
      case workflowStepConstants.updateCommittedStateRootInfo:
        oThis.chainId = oThis.requestParams.fromOriginToAux
          ? oThis.requestParams.auxChainId
          : oThis.requestParams.originChainId;
        break;
    }
    // We are assigning oThis.chainId to requestParams because requestParams should contain the chainId that the
    // current step needs to use. oThis.requestParams is being updated with the previous steps' chainId in two methods
    // above, namely: _validateAndSanitize and _clubRequestParamsFromDependencies.
    oThis.requestParams.chainId = oThis.chainId;
  }

  /**
   * Prepare the params and table for the next steps.
   *
   * @private
   */
  _prepareForNextSteps() {
    const oThis = this;

    if (oThis.taskStatus == workflowStepConstants.taskDone) {
      oThis.nextSteps = oThis.stepsToBePerformedOnSuccess;
    } else if (oThis.taskStatus == workflowStepConstants.taskFailed) {
      oThis.nextSteps = oThis.stepsToBePerformedOnFailure;
    }
  }

  /**
   * Insert entries in table and publish messages for all the next steps.
   *
   * @returns {Promise<>}
   */
  async _insertAndPublishForNextSteps() {
    const oThis = this;

    for (let index = 0; index < oThis.nextSteps.length; index++) {
      let nextStep = oThis.nextSteps[index];

      let dependencyResponse = await oThis.checkDependencies(nextStep);

      if (!dependencyResponse.data.dependencyResolved) {
        continue;
      }

      await oThis._insertAndPublishFor(nextStep);
    }
  }

  /**
   * Insert entries in table and publish message for the next step.
   *
   * @returns {Promise<>}
   */
  async _insertAndPublishFor(nextStep) {
    const oThis = this;

    let nextStepKind = new WorkflowStepsModel().invertedKinds[nextStep],
      nextStepStatus = new WorkflowStepsModel().invertedStatuses[workflowStepConstants.queuedStatus];

    //oThis._decideChainId(nextStep);

    let insertRsp = await new WorkflowStepsModel()
      .insert({
        kind: nextStepKind,
        workflow_id: oThis.workflowId,
        status: nextStepStatus
      })
      .fire();

    await oThis._clearWorkflowStatusCache(oThis.workflowId);

    let nextStepId = insertRsp.insertId;

    let messageParams = {
      topics: [oThis.topic],
      publisher: oThis._publisher,
      message: {
        kind: oThis._messageKind,
        payload: {
          stepKind: nextStep,
          taskStatus: workflowStepConstants.taskReadyToStart,
          currentStepId: nextStepId,
          workflowId: oThis.workflowId
        }
      }
    };

    let openSTNotification = await sharedRabbitMqProvider.getInstance({
        connectionWaitSeconds: connectionTimeoutConst.crons,
        switchConnectionWaitSeconds: connectionTimeoutConst.switchConnectionCrons
      }),
      setToRMQ = await openSTNotification.publishEvent.perform(messageParams);

    // If could not set to RMQ run in async.
    if (setToRMQ.isFailure() || setToRMQ.data.publishedToRmq === 0) {
      logger.error("====Couldn't publish the message to RMQ====");
      return Promise.reject({ err: "Couldn't publish next step in Rmq" });
    }

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   * Check dependencies.
   *
   * @param nextStep
   *
   * @returns {Promise<any>}
   */
  async checkDependencies(nextStep) {
    const oThis = this;

    let nextStepDetails = await oThis.getNextStepConfigs(nextStep),
      prerequisitesKinds = [];

    if (nextStepDetails.prerequisites) {
      for (let i = 0; i < nextStepDetails.prerequisites.length; i++) {
        let invertedKind = new WorkflowStepsModel().invertedKinds[nextStepDetails.prerequisites[i]];
        if (invertedKind) {
          prerequisitesKinds.push(invertedKind);
        }
      }
    }

    if (prerequisitesKinds.length > 0) {
      let prerequisitesRecords = await new WorkflowStepsModel()
        .select('*')
        .where([
          'workflow_id = ? AND kind in (?) AND status IS NOT ?',
          oThis.workflowId,
          prerequisitesKinds,
          workflowStepConstants.retriedStatus
        ])
        .fire();

      if (prerequisitesRecords.length !== nextStepDetails.prerequisites.length) {
        return Promise.resolve(responseHelper.successWithData({ dependencyResolved: 0 }));
      }
      for (let index = 0; index < prerequisitesRecords.length; index++) {
        if (
          prerequisitesRecords[index].status !=
          new WorkflowStepsModel().invertedStatuses[workflowStepConstants.processedStatus]
        ) {
          return Promise.resolve(responseHelper.successWithData({ dependencyResolved: 0 }));
        }
      }
    }

    return Promise.resolve(responseHelper.successWithData({ dependencyResolved: 1 }));
  }

  /**
   * Clear workflow status cache.
   *
   * @param {Number/String} id
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _clearWorkflowStatusCache(id) {
    let workflowCacheObj = new WorkflowStatusCache({ workflowId: id });

    await workflowCacheObj.clear();
  }

  /**
   * Clear workflow status cache.
   *
   * @param {Number/String} id
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _clearWorkflowStepsStatusCache(id) {
    let workflowStepsCacheObj = new WorkflowStepsStatusCache({ workflowId: id });

    await workflowStepsCacheObj.clear();
  }

  /**
   * First step of any workflow.
   *
   * @returns {Promise<>}
   *
   * @sets oThis.workflowId
   */
  async insertInitStep() {
    const oThis = this;

    let workflowModelInsertResponse = await new WorkflowModel()
      .insert({
        kind: new WorkflowModel().invertedKinds[oThis.workflowKind],
        status: new WorkflowModel().invertedStatuses[workflowConstants.inProgressStatus],
        client_id: oThis.clientId,
        request_params: JSON.stringify(oThis.requestParams)
      })
      .fire();

    oThis.workflowId = workflowModelInsertResponse.insertId;

    await oThis._clearWorkflowStatusCache(oThis.workflowId);

    return Promise.resolve(responseHelper.successWithData({ taskStatus: workflowStepConstants.taskDone }));
  }

  /**
   * Returns publisher.
   *
   * @returns {String}
   *
   * @private
   */
  get _publisher() {
    return 'OST_Workflow';
  }

  /**
   * Returns messageKind.
   *
   * @returns {String}
   *
   * @private
   */
  get _messageKind() {
    return 'background_job';
  }

  /**
   * Current step payload which would be stored in Pending transactions and would help in restarting flow
   *
   * @returns {Hash}
   */
  _currentStepPayloadForPendingTrx() {
    const oThis = this;

    return {
      topics: [oThis.topic],
      publisher: oThis._publisher,
      message: {
        kind: oThis._messageKind,
        payload: {
          stepKind: oThis.stepKind,
          taskStatus: workflowStepConstants.taskDone,
          currentStepId: oThis.currentStepId,
          workflowId: oThis.workflowId
        }
      }
    };
  }

  /**
   * Perform step.
   *
   * @private
   */
  _performStep() {
    throw 'sub-class to implement.';
  }

  /**
   * Update statuses in workflows and workflow steps table in case of errors
   *
   * @param {Object} debugParams
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _handleCaughtErrors(debugParams = null) {
    const oThis = this;

    debugParams = basicHelper.isEmptyObject(debugParams) ? null : debugParams;

    if (oThis.currentStepId) {
      await oThis._clearWorkflowStatusCache(oThis.currentStepId);
      await oThis._clearWorkflowStepsStatusCache(oThis.currentStepId);

      await new WorkflowStepsModel().updateRecord(oThis.currentStepId, {
        debug_params: debugParams,
        status: new WorkflowStepsModel().invertedStatuses[workflowStepConstants.failedStatus]
      });
    }

    await oThis._clearWorkflowStatusCache(oThis.workflowId);
    await oThis._clearWorkflowStepsStatusCache(oThis.currentStepId);

    await new WorkflowModel()
      .update({
        debug_params: debugParams,
        status: new WorkflowModel().invertedStatuses[workflowConstants.failedStatus]
      })
      .where({ id: oThis.workflowId })
      .fire();
  }

  /**
   * _handleSuccess
   *
   * @return {Promise<void>}
   * @private
   */
  async _handleSuccess() {
    const oThis = this;

    // Update status of workflow as completedStatus in workflows table.
    let workflowsModelResp = await new WorkflowModel()
      .update({
        status: new WorkflowModel().invertedStatuses[workflowConstants.completedStatus]
      })
      .where({
        id: oThis.workflowId
      })
      .fire();

    // If row was updated successfully.
    if (+workflowsModelResp.affectedRows === 1) {
      // Implicit string to int conversion.
      logger.win('*** Workflow with id', oThis.workflowId, 'completed successfully!');
      return Promise.resolve(responseHelper.successWithData({ taskStatus: workflowStepConstants.taskDone }));
    } else {
      return Promise.resolve(responseHelper.successWithData({ taskStatus: workflowStepConstants.taskFailed }));
    }
  }

  /**
   * _handleFailure
   *
   * @return {Promise<void>}
   * @private
   */
  async _handleFailure() {
    const oThis = this;

    // Update status of workflow as failedStatus in workflows table.
    let workflowsModelResp = await new WorkflowModel()
      .update({
        status: new WorkflowModel().invertedStatuses[workflowConstants.failedStatus]
      })
      .where({
        id: oThis.workflowId
      })
      .fire();

    // If row was updated successfully.
    if (+workflowsModelResp.affectedRows === 1) {
      // Implicit string to int conversion.
      return Promise.resolve(responseHelper.successWithData({ taskStatus: workflowStepConstants.taskDone }));
    } else {
      return Promise.resolve(responseHelper.successWithData({ taskStatus: workflowStepConstants.taskFailed }));
    }
  }
}

module.exports = WorkflowRouterBase;
