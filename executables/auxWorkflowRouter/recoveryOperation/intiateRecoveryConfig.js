/**
 * Config for initiate recovery.
 *
 * @module executables/auxWorkflowRouter/recoveryOperation/intiateRecoveryConfig
 */

const rootPrefix = '../../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const steps = {
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

module.exports = steps;
