/**
 * Config for abort recovery by owner.
 *
 * @module lib/workflow/deviceRecovery/byOwner/abortRecovery/stepsConfig
 */

const rootPrefix = '../../../../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const abortRecoveryByOwnerStepsConfig = {
  [workflowStepConstants.abortRecoveryByOwnerInit]: {
    kind: workflowStepConstants.abortRecoveryByOwnerInit,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.abortRecoveryByOwnerPerformTransaction]
  },
  [workflowStepConstants.abortRecoveryByOwnerPerformTransaction]: {
    kind: workflowStepConstants.abortRecoveryByOwnerPerformTransaction,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.abortRecoveryByOwnerVerifyTransaction]
  },
  [workflowStepConstants.abortRecoveryByOwnerVerifyTransaction]: {
    kind: workflowStepConstants.abortRecoveryByOwnerVerifyTransaction,
    readDataFrom: [workflowStepConstants.abortRecoveryByOwnerPerformTransaction],
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

module.exports = abortRecoveryByOwnerStepsConfig;
