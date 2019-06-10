/**
 * Module to retry workflow step.
 *
 * @module helpers/retryWorkflowStep
 *
 * Usage: node helpers/retryWorkflowStep.js 31062
 **/

const rootPrefix = '..',
  WorkflowModel = require(rootPrefix + '/app/models/mysql/Workflow'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  TokenModel = require(rootPrefix + '/app/models/mysql/Token'),
  TokenByClientIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token'),
  WorkflowStepModel = require(rootPrefix + '/app/models/mysql/WorkflowStep'),
  WorkflowCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Workflow'),
  WorkflowStepsStatusCache = require(rootPrefix + '/lib/cacheManagement/shared/WorkflowStepsStatus'),
  workflowTopicConstant = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  tokenConstants = require(rootPrefix + '/lib/globalConstant/token'),
  workflowStepId = process.argv[2];

// Workflow kind to router file path map.
const workflowKindToRouterPathMap = {
  [workflowConstants.tokenDeployKind]: 'lib/workflow/economySetup/Router',
  [workflowConstants.stateRootSyncKind]: 'lib/workflow/stateRootSync/Router',
  [workflowConstants.stPrimeStakeAndMintKind]: 'lib/workflow/stakeAndMint/stPrime/Router',
  [workflowConstants.btStakeAndMintKind]: 'lib/workflow/stakeAndMint/brandedToken/Router',
  [workflowConstants.grantEthStakeCurrencyKind]: 'lib/workflow/grantEthStakeCurrency/Router',
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
  [workflowConstants.updatePricePointKind]: 'lib/workflow/updatePricePoints/Router',
  [workflowConstants.logoutSessionsKind]: 'lib/workflow/logoutSessions/Router'
};

// Workflow kind to publish topic.
const workflowKindToTopic = {
  [workflowConstants.tokenDeployKind]: workflowTopicConstant.economySetup,
  [workflowConstants.stateRootSyncKind]: workflowTopicConstant.stateRootSync,
  [workflowConstants.stPrimeStakeAndMintKind]: workflowTopicConstant.stPrimeStakeAndMint,
  [workflowConstants.btStakeAndMintKind]: workflowTopicConstant.btStakeAndMint,
  [workflowConstants.grantEthStakeCurrencyKind]: workflowTopicConstant.grantEthStakeCurrency,
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
  [workflowConstants.updatePricePointKind]: workflowTopicConstant.updatePricePoint,
  [workflowConstants.logoutSessionsKind]: workflowTopicConstant.logoutSession
};

/**
 * Class to retry workflow step.
 *
 * @class RetryWorkflowStep
 */
class RetryWorkflowStep {
  /**
   * Main performer of class.
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this;

    let rowToDuplicate = await new WorkflowStepModel()
      .select('*')
      .where(['id = ?', workflowStepId])
      .fire();

    rowToDuplicate = rowToDuplicate[0];

    const workflowStepsObj = new WorkflowStepModel(),
      workflowObj = new WorkflowModel();

    // Update all workflow entries above this id
    await new WorkflowStepModel()
      .update({ status: null, unique_hash: null })
      .where({ workflow_id: rowToDuplicate.workflow_id })
      .where(['id >= ?', rowToDuplicate.id])
      .fire();

    // Insert workflow step entry for retry with queued status
    const insertRsp = await new WorkflowStepModel()
      .insert({
        workflow_id: rowToDuplicate.workflow_id,
        kind: rowToDuplicate.kind,
        status: workflowStepsObj.invertedStatuses[workflowStepConstants.queuedStatus],
        request_params: null,
        unique_hash: rowToDuplicate.unique_hash
      })
      .fire();

    const stepId = insertRsp.insertId,
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
    const Rows = await new WorkflowModel()
      .select('*')
      .where({
        id: rowToDuplicate.workflow_id
      })
      .fire();

    const params = {
      workflowId: rowToDuplicate.workflow_id,
      stepId: stepId,
      stepKind: stepKind
    };

    await oThis._changeTokenStatusAndClearCache(Rows[0].kind, Rows[0].client_id);

    await oThis._startWorkflowStep(Rows[0].kind, params);
  }

  /**
   * Clear workflow steps cache.
   *
   * @param {number/string} workflowId
   *
   * @return {Promise<void>}
   * @private
   */
  async _clearCaches(workflowId) {
    // Flush workflow cache
    await new WorkflowCache({
      workflowId: workflowId
    }).clear();

    // Flush workflow steps cache
    const workflowStepsCacheObj = new WorkflowStepsStatusCache({ workflowId: workflowId });

    await workflowStepsCacheObj.clear();
  }

  /**
   * Start workflow step.
   *
   * @param {string} workflowKind
   * @param {object} params
   *
   * @return {Promise<void>}
   * @private
   */
  async _startWorkflowStep(workflowKind, params) {
    const workflowStepModel = new WorkflowStepModel(),
      workflowModel = new WorkflowModel();

    const workflowParams = {
      stepKind: workflowStepModel.kinds[params.stepKind],
      taskStatus: 'taskReadyToStart',
      topic: workflowKindToTopic[workflowModel.kinds[workflowKind]],
      workflowId: params.workflowId,
      currentStepId: params.stepId
    };

    const Workflow = require(rootPrefix + '/' + workflowKindToRouterPathMap[workflowModel.kinds[workflowKind]]),
      workflowObj = new Workflow(workflowParams);

    return workflowObj.perform();
  }

  /**
   * Change token status
   *
   * @param {Number} workflowKind
   * @param {Number} clientId
   *
   * @return {Promise<void>}
   * @private
   */
  async _changeTokenStatusAndClearCache(workflowKind, clientId) {
    const oThis = this,
      workflowModel = new WorkflowModel();

    if (workflowKind != workflowModel.invertedKinds[workflowConstants.tokenDeployKind]) {
      return;
    }

    let tokenModel = new TokenModel({});

    await tokenModel
      .update({ status: tokenConstants.invertedStatuses[tokenConstants.deploymentStarted] })
      .where({ client_id: clientId })
      .fire();

    await new TokenByClientIdCache({
      clientId: clientId
    }).clear();
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
