'use strict';

const rootPrefix = '../../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const steps = {
  [workflowStepConstants.authorizeSessionInit]: {
    kind: workflowStepConstants.authorizeSessionInit,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.authorizeSessionPerformTransaction]
  },
  [workflowStepConstants.authorizeSessionPerformTransaction]: {
    kind: workflowStepConstants.authorizeSessionPerformTransaction,
    onFailure: workflowStepConstants.markFailure,
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
    onSuccess: [workflowStepConstants.markFailure] //NOTE: This is intentional. In order to mark the workflow failed.
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

module.exports = steps;
