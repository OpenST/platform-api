const rootPrefix = '..',
  WorkflowStepModel = require(rootPrefix + '/app/models/mysql/WorkflowStep'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  workflowStepId = process.argv[2];

class RetryWorkflowStep {
  /**
   *
   * @param workflowStepId
   *
   * @constructor
   */
  constructor(workflowStepId) {
    const oThis = this;
    oThis.workflowStepId = workflowStepId;
  }

  async perform() {
    const oThis = this,
      rowToDuplicate = await new WorkflowStepModel()
        .select('*')
        .where(['id = ?', oThis.workflowStepId])
        .fire(),
      row = rowToDuplicate[0];

    await new WorkflowStepModel()
      .insert({
        workflow_id: row.workflow_id,
        kind: row.kind,
        status: 1,
        request_params: row.request_params
      })
      .fire();

    await new WorkflowStepModel()
      .update({ status: null, unique_hash: null })
      .where(['id = ?', oThis.workflowStepId])
      .fire();
  }
}

new RetryWorkflowStep(workflowStepId)
  .perform()
  .then(function(resp) {
    logger.info('====== DONE ======');
    process.exit(0);
  })
  .catch(function(err) {
    logger.error('=====There seems to be an error====\n', err);
    process.exit(0);
  });
