/**
 * Module for abort recovery by recovery controller steps config.
 *
 * @module lib/workflow/deviceRecovery/byRecoveryController/abortRecovery/stepsConfig
 */

const rootPrefix = '../../../../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const abortRecoveryByRecoveryControllerStepsConfig = {
  [workflowStepConstants.abortRecoveryByRecoveryControllerInit]: {
    kind: workflowStepConstants.abortRecoveryByRecoveryControllerInit,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.abortRecoveryByRecoveryControllerPerformTransaction]
  },
  [workflowStepConstants.abortRecoveryByRecoveryControllerPerformTransaction]: {
    kind: workflowStepConstants.abortRecoveryByRecoveryControllerPerformTransaction,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.abortRecoveryByRecoveryControllerVerifyTransaction]
  },
  [workflowStepConstants.abortRecoveryByRecoveryControllerVerifyTransaction]: {
    kind: workflowStepConstants.abortRecoveryByRecoveryControllerVerifyTransaction,
    readDataFrom: [workflowStepConstants.abortRecoveryByRecoveryControllerPerformTransaction],
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

module.exports = abortRecoveryByRecoveryControllerStepsConfig;
