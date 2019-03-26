'use strict';
/*
 * Usage: node helpers/retryWorkflowStep.js 31062
 */

const rootPrefix = '..',
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

    await new WorkflowStepModel()
      .update({ status: null, unique_hash: null })
      .where({ workflow_id: rowToDuplicate.workflow_id })
      .where(['id >= ?', rowToDuplicate.id])
      .fire();

    await new WorkflowStepModel()
      .insert({
        workflow_id: rowToDuplicate.workflow_id,
        kind: rowToDuplicate.kind,
        status: 1,
        request_params: rowToDuplicate.request_params,
        unique_hash: rowToDuplicate.unique_hash
      })
      .fire();
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
