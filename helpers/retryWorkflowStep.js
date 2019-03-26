'use strict';
/*
 * Usage: node helpers/retryWorkflowStep.js 31062
 */

const rootPrefix = '..',
  WorkflowModel = require(rootPrefix + '/app/models/mysql/Workflow'),
  WorkflowCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Workflow'),
  WorkflowStepsStatusCache = require(rootPrefix + '/lib/cacheManagement/shared/WorkflowStepsStatus'),
  WorkflowStepModel = require(rootPrefix + '/app/models/mysql/WorkflowStep'),
  workflowStepId = process.argv[2];

class RetryWorkflowStep {
  constructor() {}

  async perform() {
    let rowToDuplicate = await new WorkflowStepModel()
      .select('*')
      .where(['id = ?', workflowStepId])
      .fire();

    rowToDuplicate = rowToDuplicate[0];

    // Update all workflow entries above this id
    await new WorkflowStepModel()
      .update({ status: null, unique_hash: null })
      .where({ workflow_id: rowToDuplicate.workflow_id })
      .where(['id >= ?', rowToDuplicate.id])
      .fire();

    // Insert entry for retry
    await new WorkflowStepModel()
      .insert({
        workflow_id: rowToDuplicate.workflow_id,
        kind: rowToDuplicate.kind,
        status: 1,
        request_params: rowToDuplicate.request_params,
        unique_hash: rowToDuplicate.unique_hash
      })
      .fire();

    // Update workflow status
    await new WorkflowModel()
      .update({ status: 1 })
      .where({
        id: rowToDuplicate.workflow_id
      })
      .fire();

    // Flush workflow cache
    await new WorkflowCache({
      workflowId: rowToDuplicate.workflow_id
    }).clear();

    // Flush workflow steps cache
    let workflowStepsCacheObj = new WorkflowStepsStatusCache({ workflowId: rowToDuplicate.workflow_id });

    await workflowStepsCacheObj.clear();
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
