'use strict';

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  sharedRabbitMqProvider = require(rootPrefix + '/lib/providers/sharedNotification'),
  WorkflowStepsModel = require(rootPrefix + '/app/models/mysql/WorkflowStep'),
  connectionTimeoutConst = require(rootPrefix + '/lib/globalConstant/connectionTimeout'),
  WorkFlowTopics = require(rootPrefix + '/lib/globalConstant/workflowTopic');

class workflowRouterBase {
  /**
   *
   * @param params {Object}
   * @param params.currentStepId {number} id of process parent
   * @param params.parentStepId {number} id of process parent
   * @param params.stepKind {string} Which step to execute in router
   * @param params.taskStatus {string} task is 'taskReadyToStart' or 'taskDone' status.
   * @param params.taskResponseData {object} when task is 'taskDone', send taskResponseData if required.
   * @param params.clientId {number}
   * @param params.chainId {number}
   * @param params.payload {object}
   *
   * @constructor
   *
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

    oThis.requestParams = params.requestParams || {};
    oThis.taskDone = false;
    oThis.taskResponseData = null;
    oThis.nextSteps = [];
    oThis.workflowRecordsMap = {};
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
      if (oThis.currentStepId) {
        await new WorkflowStepsModel().markAsFailed(oThis.currentStepId);
      }

      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('executables/workflowRouter/base::perform::catch');
        logger.error(error);
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

      let response = await oThis.stepsFactory();

      console.log('------------------after---stepsFactory------------asyncPerform---');
      console.log(response);

      if (response.isFailure()) {
        logger.error('Error......', response);
        return Promise.reject(response);
      } else {
        oThis.taskDone = response.data.taskDone;
        oThis.taskResponseData = response.data.taskResponseData;
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
    if (oThis.taskResponseData) {
      updateData.response_data = JSON.stringify(oThis.taskResponseData);
    }
    if (oThis.taskDone) {
      updateData.status = new WorkflowStepsModel().invertedStatuses[workflowStepConstants.processedStatus];
      await new WorkflowStepsModel().updateRecord(oThis.currentStepId, updateData);

      await oThis.insertAndPublishNextSteps(oThis.nextSteps);
    } else if (updateData.response_data) {
      await new WorkflowStepsModel().updateRecord(oThis.currentStepId, updateData);
    }

    return Promise.resolve(responseHelper.successWithData({}));
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

    console.log('-------oThis.requestParams------', JSON.stringify(oThis.requestParams));
    if (!oThis.clientId || !oThis.chainId) {
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
   *
   * First step of any workflow.
   *
   * @returns {Promise<>}
   *
   * @sets oThis.currentStepId, oThis.parentStepId
   *
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

      console.log('-----------------------dependencyResponse----------', dependencyResponse);
      if (!dependencyResponse.data.dependencyResolved) {
        continue;
      }

      let nextStepKind = new WorkflowStepsModel().invertedKinds[nextStep],
        nextStepStatus = new WorkflowStepsModel().invertedStatuses[workflowStepConstants.queuedStatus];
      let insertRsp = await new WorkflowStepsModel()
        .insert({
          kind: nextStepKind,
          client_id: oThis.clientId,
          chain_id: oThis.chainId,
          parent_id: oThis.parentStepId,
          status: nextStepStatus
        })
        .fire();

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
    }
    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   *
   *
   * @returns {string}
   * @private
   */
  get _publisher() {
    const oThis = this;

    return 'OST_Workflow';
  }

  /**
   *
   * @returns {string}
   * @private
   */
  get _messageKind() {
    const oThis = this;

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
      if (prerequisitesRecords.length != nextStepDetails.prerequisites.length) {
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
}

module.exports = workflowRouterBase;
