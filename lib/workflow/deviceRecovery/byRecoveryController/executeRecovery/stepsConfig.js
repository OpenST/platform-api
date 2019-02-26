/**
 * Config for execute recovery.
 *
 * @module lib/workflow/deviceRecovery/byRecoveryController/executeRecovery/stepsConfig
 */

const rootPrefix = '../../../../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const executeRecoveryStepsConfig = {
  [workflowStepConstants.executeRecoveryInit]: {
    kind: workflowStepConstants.executeRecoveryInit,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.executeRecoveryPerformTransaction]
  },
  [workflowStepConstants.executeRecoveryPerformTransaction]: {
    kind: workflowStepConstants.executeRecoveryPerformTransaction,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.executeRecoveryVerifyTransaction]
  },
  [workflowStepConstants.executeRecoveryVerifyTransaction]: {
    kind: workflowStepConstants.executeRecoveryVerifyTransaction,
    readDataFrom: [workflowStepConstants.executeRecoveryPerformTransaction],
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

module.exports = executeRecoveryStepsConfig;
