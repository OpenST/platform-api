/**
 * Module for authorize session steps config.
 *
 * @module lib/workflow/authorizeSession/stepsConfig
 */

const rootPrefix = '../../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const authorizeSessionStepsConfig = {
  [workflowStepConstants.authorizeSessionInit]: {
    kind: workflowStepConstants.authorizeSessionInit,
    onFailure: workflowStepConstants.rollbackAuthorizeSessionTransaction,
    onSuccess: [workflowStepConstants.authorizeSessionPerformTransaction]
  },
  [workflowStepConstants.authorizeSessionPerformTransaction]: {
    kind: workflowStepConstants.authorizeSessionPerformTransaction,
    onFailure: workflowStepConstants.rollbackAuthorizeSessionTransaction,
    onSuccess: [workflowStepConstants.authorizeSessionVerifyTransaction]
  },
  [workflowStepConstants.authorizeSessionVerifyTransaction]: {
    kind: workflowStepConstants.authorizeSessionVerifyTransaction,
    readDataFrom: [workflowStepConstants.authorizeSessionPerformTransaction],
    onFailure: workflowStepConstants.rollbackAuthorizeSessionTransaction,
    onSuccess: [workflowStepConstants.markSuccess]
  },
  [workflowStepConstants.rollbackAuthorizeSessionTransaction]: {
    kind: workflowStepConstants.rollbackAuthorizeSessionTransaction,
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

module.exports = authorizeSessionStepsConfig;
