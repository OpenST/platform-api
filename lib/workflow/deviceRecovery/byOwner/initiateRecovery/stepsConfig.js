/**
 * Module for initiate recovery steps config.
 *
 * @module lib/workflow/deviceRecovery/byOwner/initiateRecovery/stepsConfig
 */

const rootPrefix = '../../../../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const initiateRecoveryByOwnerStepsConfig = {
  [workflowStepConstants.initiateRecoveryInit]: {
    kind: workflowStepConstants.initiateRecoveryInit,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.initiateRecoveryPerformTransaction]
  },
  [workflowStepConstants.initiateRecoveryPerformTransaction]: {
    kind: workflowStepConstants.initiateRecoveryPerformTransaction,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.initiateRecoveryVerifyTransaction]
  },
  [workflowStepConstants.initiateRecoveryVerifyTransaction]: {
    kind: workflowStepConstants.initiateRecoveryVerifyTransaction,
    readDataFrom: [workflowStepConstants.initiateRecoveryPerformTransaction],
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

module.exports = initiateRecoveryByOwnerStepsConfig;
