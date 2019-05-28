/**
 * Module for revoke session steps config.
 *
 * @module lib/workflow/revokeSession/stepsConfig
 */

const rootPrefix = '../../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const revokeSessionStepsConfig = {
  [workflowStepConstants.revokeSessionInit]: {
    kind: workflowStepConstants.revokeSessionInit,
    onFailure: workflowStepConstants.rollbackRevokeSessionTransaction,
    onSuccess: [workflowStepConstants.revokeSessionPerformTransaction]
  },
  [workflowStepConstants.revokeSessionPerformTransaction]: {
    kind: workflowStepConstants.revokeSessionPerformTransaction,
    onFailure: workflowStepConstants.rollbackRevokeSessionTransaction,
    onSuccess: [workflowStepConstants.revokeSessionVerifyTransaction]
  },
  [workflowStepConstants.revokeSessionVerifyTransaction]: {
    kind: workflowStepConstants.revokeSessionVerifyTransaction,
    readDataFrom: [workflowStepConstants.revokeSessionPerformTransaction],
    onFailure: workflowStepConstants.rollbackRevokeSessionTransaction,
    onSuccess: [workflowStepConstants.markSuccess]
  },
  [workflowStepConstants.rollbackRevokeSessionTransaction]: {
    kind: workflowStepConstants.rollbackRevokeSessionTransaction,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.markFailure] // NOTE: This is intentional. In order to mark the workflow failed.
  },
  [workflowStepConstants.markSuccess]: {
    kind: workflowStepConstants.markSuccess,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: []
  },
  [workflowStepConstants.markFailure]: {
    kind: workflowStepConstants.markFailure,
    onSuccess: []
  }
};

module.exports = revokeSessionStepsConfig;
