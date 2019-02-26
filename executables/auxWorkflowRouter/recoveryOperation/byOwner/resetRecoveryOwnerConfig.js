/**
 * Config for reset recovery owner.
 *
 * @module executables/auxWorkflowRouter/recoveryOperation/byOwner/resetRecoveryOwnerConfig
 */

const rootPrefix = '../../../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const steps = {
  [workflowStepConstants.resetRecoveryOwnerInit]: {
    kind: workflowStepConstants.resetRecoveryOwnerInit,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.resetRecoveryOwnerPerformTransaction]
  },
  [workflowStepConstants.resetRecoveryOwnerPerformTransaction]: {
    kind: workflowStepConstants.resetRecoveryOwnerPerformTransaction,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.resetRecoveryOwnerVerifyTransaction]
  },
  [workflowStepConstants.resetRecoveryOwnerVerifyTransaction]: {
    kind: workflowStepConstants.resetRecoveryOwnerVerifyTransaction,
    readDataFrom: [workflowStepConstants.resetRecoveryOwnerPerformTransaction],
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
