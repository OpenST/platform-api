'use strict';
/*
 * Usage: node helpers/retryWorkflowStep.js 31062
 */

const rootPrefix = '..',
  WorkflowModel = require(rootPrefix + '/app/models/mysql/Workflow'),
  WorkflowCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Workflow'),
  WorkflowStepsStatusCache = require(rootPrefix + '/lib/cacheManagement/shared/WorkflowStepsStatus'),
  WorkflowStepModel = require(rootPrefix + '/app/models/mysql/WorkflowStep'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  workflowTopicConstant = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  workflowStepId = process.argv[2];

// Workflow kind to router file path map
let workflowKindToRouterPathMap = {
  [workflowConstants.tokenDeployKind]: 'lib/workflow/economySetup/Router',
  [workflowConstants.stateRootSyncKind]: 'lib/workflow/stateRootSync/Router',
  [workflowConstants.stPrimeStakeAndMintKind]: 'lib/workflow/stakeAndMint/stPrime/Router',
  [workflowConstants.btStakeAndMintKind]: 'lib/workflow/stakeAndMint/brandedToken/Router',
  [workflowConstants.grantEthOstKind]: 'lib/workflow/grantEthOst/Router',
  [workflowConstants.setupUserKind]: 'lib/workflow/userSetup/Router',
  [workflowConstants.testKind]: 'lib/workflow/test/Router',
  [workflowConstants.authorizeDeviceKind]: 'lib/workflow/authorizeDevice/Router',
  [workflowConstants.authorizeSessionKind]: 'lib/workflow/authorizeSession/Router',
  [workflowConstants.revokeDeviceKind]: 'lib/workflow/revokeDevice/Router',
  [workflowConstants.revokeSessionKind]: 'lib/workflow/revokeSession/Router',
  [workflowConstants.initiateRecoveryKind]: 'lib/workflow/deviceRecovery/byOwner/initiateRecovery/Router',
  [workflowConstants.abortRecoveryByOwnerKind]: 'lib/workflow/deviceRecovery/byOwner/abortRecovery/Router',
  [workflowConstants.resetRecoveryOwnerKind]: 'lib/workflow/deviceRecovery/byOwner/resetRecoveryOwner/Router',
  [workflowConstants.executeRecoveryKind]: 'lib/workflow/deviceRecovery/byRecoveryController/executeRecovery/Router',
  [workflowConstants.abortRecoveryByRecoveryControllerKind]: 'lib/workflow/deviceRecovery/byOwner/abortRecovery/Router',
  [workflowConstants.logoutSessionsKind]: 'lib/workflow/logoutSessions/Router'
};

// Workflow kind to publish topic
let workflowKindToTopic = {
  [workflowConstants.tokenDeployKind]: workflowTopicConstant.economySetup,
  [workflowConstants.stateRootSyncKind]: workflowTopicConstant.stateRootSync,
  [workflowConstants.stPrimeStakeAndMintKind]: workflowTopicConstant.stPrimeStakeAndMint,
  [workflowConstants.btStakeAndMintKind]: workflowTopicConstant.btStakeAndMint,
  [workflowConstants.grantEthOstKind]: workflowTopicConstant.grantEthOst,
  [workflowConstants.setupUserKind]: workflowTopicConstant.userSetup,
  [workflowConstants.testKind]: workflowTopicConstant.test,
  [workflowConstants.authorizeDeviceKind]: workflowTopicConstant.authorizeDevice,
  [workflowConstants.authorizeSessionKind]: workflowTopicConstant.authorizeSession,
  [workflowConstants.revokeDeviceKind]: workflowTopicConstant.revokeDevice,
  [workflowConstants.revokeSessionKind]: workflowTopicConstant.revokeSession,
  [workflowConstants.initiateRecoveryKind]: workflowTopicConstant.initiateRecovery,
  [workflowConstants.abortRecoveryByOwnerKind]: workflowTopicConstant.abortRecoveryByOwner,
  [workflowConstants.resetRecoveryOwnerKind]: workflowTopicConstant.resetRecoveryOwner,
  [workflowConstants.executeRecoveryKind]: workflowTopicConstant.executeRecovery,
  [workflowConstants.abortRecoveryByRecoveryControllerKind]: workflowTopicConstant.abortRecoveryByRecoveryController,
  [workflowConstants.logoutSessionsKind]: workflowTopicConstant.logoutSession
};

class RetryWorkflowStep {
  constructor() {}

  async perform() {
    const oThis = this;

    let rowToDuplicate = await new WorkflowStepModel()
      .select('*')
      .where(['id = ?', workflowStepId])
      .fire();

    rowToDuplicate = rowToDuplicate[0];

    let workflowStepsObj = new WorkflowStepModel(),
      workflowObj = new WorkflowModel();

    // Update all workflow entries above this id
    await new WorkflowStepModel()
      .update({ status: null, unique_hash: null })
      .where({ workflow_id: rowToDuplicate.workflow_id })
      .where(['id >= ?', rowToDuplicate.id])
      .fire();

    // Insert workflow step entry for retry with queued status
    let insertRsp = await new WorkflowStepModel()
      .insert({
        workflow_id: rowToDuplicate.workflow_id,
        kind: rowToDuplicate.kind,
        status: workflowStepsObj.invertedStatuses[workflowStepConstants.queuedStatus],
        request_params: null,
        unique_hash: rowToDuplicate.unique_hash
      })
      .fire();

    let stepId = insertRsp.insertId,
      stepKind = rowToDuplicate.kind;

    // Update workflow status to processing
    await new WorkflowModel()
      .update({ status: workflowObj.invertedStatuses[workflowConstants.inProgressStatus] })
      .where({
        id: rowToDuplicate.workflow_id
      })
      .fire();

    await oThis._clearCaches(rowToDuplicate.workflow_id);

    // Start workflow
    let Rows = await new WorkflowModel()
      .select('*')
      .where({
        id: rowToDuplicate.workflow_id
      })
      .fire();

    let params = {
      workflowId: rowToDuplicate.workflow_id,
      stepId: stepId,
      stepKind: stepKind
    };

    await oThis._startWorkflow(Rows[0].kind, params);
  }

  async _clearCaches(workflowId) {
    const oThis = this;

    // Flush workflow cache
    await new WorkflowCache({
      workflowId: workflowId
    }).clear();

    // Flush workflow steps cache
    let workflowStepsCacheObj = new WorkflowStepsStatusCache({ workflowId: workflowId });

    await workflowStepsCacheObj.clear();
  }

  /**
   * Start workflow
   *
   * @param workflowKind
   * @param params
   * @return {Promise<void>}
   * @private
   */
  async _startWorkflow(workflowKind, params) {
    const oThis = this;

    let workflowStepModel = new WorkflowStepModel(),
      workflowModel = new WorkflowModel();

    let workflowParams = {
      stepKind: workflowStepModel.kinds[params.stepKind],
      taskStatus: 'taskReadyToStart',
      topic: workflowKindToTopic[workflowModel.kinds[workflowKind]],
      workflowId: params.workflowId,
      currentStepId: params.stepId
    };

    let Workflow = require(rootPrefix + '/' + workflowKindToRouterPathMap[workflowModel.kinds[workflowKind]]),
      workflowObj = new Workflow(workflowParams);

    return workflowObj.perform();
  }
}

new RetryWorkflowStep()
  .perform()
  .then(function() {
    console.log('====== READY FOR RETRY =======');
    process.exit(0);
  })
  .catch(function(err) {
    console.error('=====Seems to be an error======\n', err);
    process.exit(0);
  });
