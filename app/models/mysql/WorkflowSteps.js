'use strict';

/**
 * This is model for workflow_setup table.
 *
 * @module app/models/mysql/WorkflowSteps
 */
const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  workflowSetupConstants = require(rootPrefix + '/lib/globalConstant/workflowSteps'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base');

const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment,
  statuses = {
    '1': workflowSetupConstants.queuedStatus,
    '2': workflowSetupConstants.pendingStatus,
    '3': workflowSetupConstants.processedStatus,
    '4': workflowSetupConstants.failedStatus,
    '5': workflowSetupConstants.timeoutStatus
  },
  invertedStatuses = util.invert(statuses),
  kinds = {
    '1': workflowSetupConstants.s1,
    '2': workflowSetupConstants.s2
  },
  invertedKinds = util.invert(kinds);

class WorkflowSteps extends ModelBase {
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'workflow_steps';
  }

  /**
   * This function will mark the step as success
   *
   * @param id
   */
  async markAsSuccess(id) {
    const oThis = this;

    return oThis
      .update({ status: invertedStatuses[workflowSetupConstants.processedStatus] })
      .where({ id: id })
      .fire();
  }
  /**
   * This function will mark the step as queued
   *
   * @param id
   */
  markAsQueued(id) {
    const oThis = this;

    return oThis
      .update({ status: invertedStatuses[workflowSetupConstants.queuedStatus] })
      .where({ id: id })
      .fire();
  }
}

module.exports = WorkflowSteps;
