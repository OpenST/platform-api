'use strict';
/**
 * Base class for workflow router.
 *
 * @module executables/workflowRouter/base
 */
const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  WorkflowStepsModel = require(rootPrefix + '/app/models/mysql/WorkflowStep'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  sharedRabbitMqProvider = require(rootPrefix + '/lib/providers/sharedNotification'),
  WorkflowStepsCache = require(rootPrefix + '/lib/sharedCacheManagement/WorkflowSteps'),
  connectionTimeoutConst = require(rootPrefix + '/lib/globalConstant/connectionTimeout');

/**
 * Class for workflow router base.
 *
 * @class
 */
class workflowRouterBase {
  /**
   * Constructor for workflow router base.
   *
   * @param {Object} params
   * @param {Number} params.currentStepId  id of process parent
   * @param {Number} params.parentStepId {Number} id of process parent
   * @param {String} params.stepKind Which step to execute in router
   * @param {String} params.taskStatus task is 'taskReadyToStart' or 'taskDone' status.
   * @param {Object} params.taskResponseData when task is 'taskDone', send taskResponseData if required.
   * @param {Number} params.clientId
   * @param {Number} params.chainId
   * @param {Number} params.groupId
   * @param {Object} params.payload
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;
    oThis.currentStepId = params.currentStepId;
    oThis.parentStepId = params.parentStepId;
    oThis.topic = params.topic;

    oThis.stepKind = params.stepKind;
    oThis.taskStatus = params.taskStatus;
    oThis.taskResponseData = params.taskResponseData;

    oThis.clientId = params.clientId;
    oThis.chainId = params.chainId;
    oThis.groupId = params.groupId;

    oThis.requestParams = params.requestParams || {};
    oThis.taskDone = false;
    oThis.nextSteps = [];
    oThis.workflowRecordsMap = {};
    oThis.transactionHash = null;
  }

  /**
   *
   *  performer
   *
   * @returns {Promise<>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(async function(error) {
      if (responseHelper.isCustomResult(error)) {
        logger.error(error.getDebugData());
        await oThis._clearWorkflowStepsCache(oThis.parentStepId);
        await new WorkflowStepsModel().updateRecord(oThis.currentStepId, {
          debug_params: JSON.stringify(error.getDebugData()),
          status: new WorkflowStepsModel().invertedStatuses[workflowStepConstants.failedStatus]
        });
        return error;
      } else {
        logger.error('executables/workflowRouter/base::perform::catch');
        logger.error(error);
        await new WorkflowStepsModel().markAsFailed(oThis.currentStepId);
        return responseHelper.error({
          internal_error_identifier: 'e_wr_b_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   *
   * async performer
   *
   * @returns {Promise<>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis.validateAndConfig();

    await oThis.getWorkflowRecords();

    await oThis.validateAndSanitize();

    if (oThis.taskStatus == workflowStepConstants.taskReadyToStart) {
      await new WorkflowStepsModel().markAsPending(oThis.currentStepId);
      await oThis._clearWorkflowStepsCache(oThis.parentStepId);

      let response = await oThis.stepsFactory();

      console.log('------------------after---stepsFactory------------asyncPerform---', oThis.currentStepId, response);

      if (response.isFailure()) {
        logger.error('Error......', response);
        return Promise.reject(response);
      } else {
        oThis.taskDone = response.data.taskDone;
        oThis.taskResponseData = response.data.taskResponseData;
        oThis.transactionHash = response.data.transactionHash;
      }
    } else if (oThis.taskStatus == workflowStepConstants.taskDone) {
      oThis.taskDone = true;
    } else {
      logger.error(
        'Unsupported Task status ' + oThis.taskStatus + ' inside executables/workflowRouter/testProcessRouter.js'
      );
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_wr_b_4',
          api_error_identifier: 'something_went_wrong',
          debug_options: { taskStatus: oThis.taskStatus }
        })
      );
    }

    let updateData = {};

    if (oThis.transactionHash) {
      updateData.transaction_hash = oThis.transactionHash;
    }

    if (oThis.taskResponseData) {
      updateData.response_data = JSON.stringify(oThis.taskResponseData);
    }

    console.log('------------------------------updateData---', oThis.currentStepId, updateData);

    if (oThis.taskDone == 1) {
      updateData.status = new WorkflowStepsModel().invertedStatuses[workflowStepConstants.processedStatus];
      await new WorkflowStepsModel().updateRecord(oThis.currentStepId, updateData);

      await oThis.insertAndPublishNextSteps(oThis.nextSteps);
    } else if (oThis.taskDone == -1) {
      updateData.status = new WorkflowStepsModel().invertedStatuses[workflowStepConstants.failedStatus];
      await new WorkflowStepsModel().updateRecord(oThis.currentStepId, updateData);

      if (oThis.currentStepConfig.onFailure && oThis.currentStepConfig.onFailure != '') {
        oThis._insertAndPublishNextStep(oThis.currentStepConfig.onFailure);
      }
    } else if (updateData.response_data || updateData.transaction_hash) {
      await new WorkflowStepsModel().updateRecord(oThis.currentStepId, updateData);
    }

    await oThis._clearWorkflowStepsCache(oThis.parentStepId);

    return Promise.resolve(responseHelper.successWithData({ workflowId: oThis.parentStepId }));
  }

  /**
   *
   * validate and sanitize
   *
   * @returns {Promise<>}
   *
   * @sets oThis.nextSteps
   */
  async validateAndConfig() {
    const oThis = this;

    if (!oThis.currentStepConfig) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_wr_b_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: { stepKind: oThis.stepKind }
        })
      );
    }

    oThis.nextSteps = oThis.currentStepConfig.onSuccess || [];
    oThis.readDataFromSteps = oThis.currentStepConfig.readDataFrom || [];

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   *
   * Get request params using parentId
   *
   * @returns {Promise<any>}
   *
   * @sets oThis.requestParams, oThis.clientId, oThis.chainId
   *
   */
  async getWorkflowRecords() {
    const oThis = this;
    if (oThis.parentStepId) {
      let workflowRecords = await new WorkflowStepsModel()
        .select('*')
        .where(['id in (?)', [oThis.parentStepId, oThis.currentStepId]])
        .fire();

      for (let i = 0; i < workflowRecords.length; i++) {
        oThis.workflowRecordsMap[workflowRecords[i].id] = workflowRecords[i];
        if (workflowRecords[i].id == oThis.currentStepId) {
          oThis.chainId = workflowRecords[i].chain_id;
        }
      }

      await oThis.getDependentWorkflowRecords();
    }

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   *
   * Get request params using parentId
   *
   * @returns {Promise<any>}
   *
   * @sets oThis.requestParams, oThis.clientId, oThis.chainId
   *
   */
  async getDependentWorkflowRecords() {
    const oThis = this;
    if (oThis.readDataFromSteps.length > 0) {
      let workflowRecordsKinds = [];

      for (let i = 0; i < oThis.readDataFromSteps.length; i++) {
        let invertedKind = new WorkflowStepsModel().invertedKinds[oThis.readDataFromSteps[i]];
        if (invertedKind) {
          workflowRecordsKinds.push(invertedKind);
        }
      }

      let workflowRecords = await new WorkflowStepsModel()
        .select('*')
        .where(['parent_id = ? AND kind in (?)', oThis.parentStepId, workflowRecordsKinds])
        .fire();

      for (let i = 0; i < workflowRecords.length; i++) {
        oThis.workflowRecordsMap[workflowRecords[i].id] = workflowRecords[i];
      }
    }

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   *
   * Set data from workflow records.
   *
   * @returns {Promise<>}
   *
   * @sets oThis.requestParams, oThis.clientId, oThis.chainId
   *
   */
  async validateAndSanitize() {
    const oThis = this;

    let parentRecord = oThis.workflowRecordsMap[oThis.parentStepId],
      currentRecord = oThis.workflowRecordsMap[oThis.currentStepId];

    if (oThis.parentStepId) {
      // check for parent and current records
      if (
        !currentRecord ||
        !(
          currentRecord.status == new WorkflowStepsModel().invertedStatuses[workflowStepConstants.queuedStatus] ||
          currentRecord.status == new WorkflowStepsModel().invertedStatuses[workflowStepConstants.pendingStatus]
        )
      ) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'e_wr_b_7',
            api_error_identifier: 'something_went_wrong',
            debug_options: { parentStepId: oThis.parentStepId }
          })
        );
      }

      // check for parent record present
      if (!parentRecord) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'e_wr_b_6',
            api_error_identifier: 'something_went_wrong',
            debug_options: { parentStepId: oThis.parentStepId }
          })
        );
      }

      oThis.requestParams = JSON.parse(parentRecord.request_params);
      oThis.clientId = parentRecord.client_id;
      oThis.chainId = parentRecord.chain_id;
    }

    for (let workflowId in oThis.workflowRecordsMap) {
      let workflowData = oThis.workflowRecordsMap[workflowId];
      if (workflowData.response_data) {
        Object.assign(oThis.requestParams, JSON.parse(workflowData.response_data));
      }
    }

    console.log('-------oThis.requestParams------', oThis.currentStepId, JSON.stringify(oThis.requestParams));

    if (!oThis.clientId && !oThis.chainId) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_wr_b_5',
          api_error_identifier: 'something_went_wrong',
          debug_options: { parentStepId: oThis.parentStepId }
        })
      );
    }

    return Promise.resolve(responseHelper.successWithData({}));
  }
  /**
   * First step of any workflow.
   *
   * @returns {Promise<>}
   *
   * @sets oThis.currentStepId, oThis.parentStepId
   */
  async insertInitStep() {
    const oThis = this;

    let insertResp = await new WorkflowStepsModel()
      .insert({
        kind: new WorkflowStepsModel().invertedKinds[oThis.stepKind],
        client_id: oThis.clientId,
        chain_id: oThis.chainId,
        request_params: JSON.stringify(oThis.requestParams),
        status: new WorkflowStepsModel().invertedStatuses[workflowStepConstants.queuedStatus]
      })
      .fire();

    oThis.currentStepId = insertResp.insertId;
    oThis.parentStepId = insertResp.insertId;

    await oThis._clearWorkflowStepsCache(oThis.currentStepId);

    return Promise.resolve(responseHelper.successWithData({ taskDone: 1 }));
  }

  /**
   *
   * next steps of workflow.
   *
   * @returns {Promise<>}
   *
   * @sets oThis.currentStepId, oThis.parentStepId
   *
   */
  async insertAndPublishNextSteps() {
    const oThis = this;

    for (let index = 0; index < oThis.nextSteps.length; index++) {
      let nextStep = oThis.nextSteps[index];

      let dependencyResponse = await oThis.checkDependencies(nextStep);

      console.log('-----------------------dependencyResponse----------', oThis.currentStepId, dependencyResponse);
      if (!dependencyResponse.data.dependencyResolved) {
        continue;
      }

      await oThis._insertAndPublishNextStep(nextStep);
    }
    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   *
   * next steps of workflow.
   *
   * @returns {Promise<>}
   *
   * @sets oThis.currentStepId, oThis.parentStepId
   *
   */
  async _insertAndPublishNextStep(nextStep) {
    const oThis = this;

    let nextStepKind = new WorkflowStepsModel().invertedKinds[nextStep],
      nextStepStatus = new WorkflowStepsModel().invertedStatuses[workflowStepConstants.queuedStatus];

    let chainId;

    switch (nextStep) {
      case workflowStepConstants.economySetupInit:
      case workflowStepConstants.markSuccess:
      case workflowStepConstants.markFailure:
        chainId = oThis.chainId;
        break;

      case workflowStepConstants.generateTokenAddresses:
      case workflowStepConstants.deployOriginTokenOrganization:
      case workflowStepConstants.deployOriginBrandedToken:
      case workflowStepConstants.saveOriginTokenOrganization:
      case workflowStepConstants.saveOriginBrandedToken:
      case workflowStepConstants.tokenDeployGateway:
      case workflowStepConstants.saveTokenGateway:
      case workflowStepConstants.activateTokenGateway:
      case workflowStepConstants.setGatewayInBt:
        chainId = oThis.requestParams.originChainId;
        break;

      case workflowStepConstants.deployAuxTokenOrganization:
      case workflowStepConstants.saveAuxTokenOrganization:
      case workflowStepConstants.deployUtilityBrandedToken:
      case workflowStepConstants.saveUtilityBrandedToken:
      case workflowStepConstants.saveTokenCoGateway:
      case workflowStepConstants.updateTokenInOstView:
      case workflowStepConstants.tokenDeployCoGateway:
      case workflowStepConstants.setCoGatewayInUbt:
        chainId = oThis.requestParams.auxChainId;
        break;
    }

    let insertRsp = await new WorkflowStepsModel()
      .insert({
        kind: nextStepKind,
        client_id: oThis.clientId,
        chain_id: chainId,
        parent_id: oThis.parentStepId,
        status: nextStepStatus
      })
      .fire();

    await oThis._clearWorkflowStepsCache(oThis.parentStepId);

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
          parentStepId: oThis.parentStepId
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
   * Returns publisher.
   *
   * @returns {String}
   * @private
   */
  get _publisher() {
    return 'OST_Workflow';
  }

  /**
   * Returns messageKind.
   *
   * @returns {String}
   * @private
   */
  get _messageKind() {
    return 'background_job';
  }

  /**
   *
   * ch
   * @param nextStep
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
        .where(['parent_id = ? AND kind in (?)', oThis.parentStepId, prerequisitesKinds])
        .fire();
      if (prerequisitesRecords.length !== nextStepDetails.prerequisites.length) {
        return Promise.resolve(responseHelper.successWithData({ dependencyResolved: 0 }));
      }
      for (let i = 0; i < prerequisitesRecords.length; i++) {
        if (
          prerequisitesRecords[i].status !=
          new WorkflowStepsModel().invertedStatuses[workflowStepConstants.processedStatus]
        ) {
          return Promise.resolve(responseHelper.successWithData({ dependencyResolved: 0 }));
        }
      }
    }

    return Promise.resolve(responseHelper.successWithData({ dependencyResolved: 1 }));
  }

  async _clearWorkflowStepsCache(id) {
    let workflowStepsCacheObj = new WorkflowStepsCache({ workflowId: id });
    await workflowStepsCacheObj.clear();
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
          parentStepId: oThis.parentStepId
        }
      }
    };
  }
}

module.exports = workflowRouterBase;
