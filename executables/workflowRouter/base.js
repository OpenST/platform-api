'use strict';

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  WorkflowStepsModel = require(rootPrefix + '/app/models/mysql/WorkflowSteps');

class workflowRouterBase {
  /**
   *
   * @param params {Object}
   * @param params.stepKind {string} Which step to execute in router
   * @param params.currentStepId {number} id of process parent
   * @param params.parentStepId {number} id of process parent
   * @param params.status {string}
   * @param params.payload {object}
   *
   * @constructor
   *
   */
  constructor(params) {
    const oThis = this;
    oThis.currentStepId = params.currentStepId;
    oThis.parentStepId = params.parentStepId;

    oThis.stepKind = params.stepKind;
    oThis.taskStatus = params.taskStatus;
    oThis.clientId = params.clientId;
    oThis.chainId = params.chainId;

    oThis.requestParams = params.requestParams;
    oThis.taskDone = false;
    oThis.nextSteps = [];
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

    await oThis.validateAndSanitize();

    // set requestParams using parent id
    await oThis.getRequestParams();

    if (oThis.taskStatus == workflowStepConstants.taskReadyToStart) {
      let response = await oThis.stepsFactory();

      console.log('------------------after---stepsFactory------------asyncPerform---');
      console.log(response);

      if (response.isFailure()) {
        logger.error('Error......', response);
        return Promise.reject(response);
      } else {
        oThis.taskDone = response.data.taskDone;
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

    if (oThis.taskDone) {
      await new WorkflowStepsModel().markAsSuccess(oThis.currentStepId);
      await oThis.insertAndPublishNextSteps(oThis.nextSteps);
    } else {
      await new WorkflowStepsModel().markAsPending(oThis.currentStepId);
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
  async validateAndSanitize() {
    const oThis = this;

    if (!oThis.currentStepDetails) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_wr_b_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: { stepKind: oThis.stepKind }
        })
      );
    }

    oThis.nextSteps = oThis.currentStepDetails.onSuccess;

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
  async getRequestParams() {
    const oThis = this;
    if (oThis.parentStepId) {
      //Fetch parent record details
      let parentRecord = (await new WorkflowStepsModel()
        .select('*')
        .where(['id in (?)', [oThis.parentStepId, oThis.currentStepId]])
        .fire())[0];

      if (!parentRecord) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'e_wr_b_6',
            api_error_identifier: 'something_went_wrong',
            debug_options: { parentStepId: oThis.parentStepId }
          })
        );
      }
      oThis.requestParams = parentRecord.request_params;
      oThis.clientId = parentRecord.client_id;
      oThis.chainId = parentRecord.chain_id;
    }

    if (!oThis.requestParams || !oThis.clientId || !oThis.chainId) {
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
        request_params: oThis.requestParams,
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

      let insertRsp = await new WorkflowStepsModel()
        .insert({
          kind: new WorkflowStepsModel().invertedKinds[nextStep],
          client_id: oThis.clientId,
          chain_id: oThis.chainId,
          parent_id: oThis.parentStepId,
          status: new WorkflowStepsModel().invertedStatuses[workflowStepConstants.queuedStatus]
        })
        .fire();

      let nextStepId = insertRsp.insertId;

      //publish
      // a = {
      //   currentStepId: nextStepId,
      //   parentStepId: oThis.parentStepId
      // }
    }
    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   *
   * ch
   * @param nextStep
   * @returns {Promise<any>}
   */
  async checkDependencies(nextStep) {
    const oThis = this;

    let nextStepDetails = await oThis.getNextStepDetails(nextStep),
      prerequisitesIds = [];

    if (nextStepDetails.prerequisites) {
      for (let i = 0; i < nextStepDetails.prerequisites.length; i++) {
        let invertedKind = new WorkflowStepsModel().invertedKinds[nextStepDetails.prerequisites[i]];
        if (invertedKind) {
          prerequisitesIds.push(invertedKind);
        }
      }
    }

    if (prerequisitesIds.length > 0) {
      let prerequisitesRecords = await new WorkflowStepsModel()
        .select('*')
        .where(['id in (?)', prerequisitesIds])
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
