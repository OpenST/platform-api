'use strict';

const rootPrefix = '../../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const logoutSessionsStepsConfig = {
  [workflowStepConstants.logoutSessionInit]: {
    kind: workflowStepConstants.logoutSessionInit,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.logoutSessionPerformTransaction]
  },
  [workflowStepConstants.logoutSessionPerformTransaction]: {
    kind: workflowStepConstants.logoutSessionPerformTransaction,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.logoutSessionVerifyTransaction]
  },
  [workflowStepConstants.logoutSessionVerifyTransaction]: {
    kind: workflowStepConstants.logoutSessionVerifyTransaction,
    readDataFrom: [workflowStepConstants.logoutSessionPerformTransaction],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.markSuccess]
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

module.exports = logoutSessionsStepsConfig;
