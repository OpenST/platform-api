'use strict';

const rootPrefix = '../../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const revokeDeviceStepsConfig = {
  [workflowStepConstants.revokeDeviceInit]: {
    kind: workflowStepConstants.revokeDeviceInit,
    onFailure: workflowStepConstants.rollbackRevokeDeviceTransaction,
    onSuccess: [workflowStepConstants.revokeDevicePerformTransaction]
  },
  [workflowStepConstants.revokeDevicePerformTransaction]: {
    kind: workflowStepConstants.revokeDevicePerformTransaction,
    onFailure: workflowStepConstants.rollbackRevokeDeviceTransaction,
    onSuccess: [workflowStepConstants.revokeDeviceVerifyTransaction]
  },
  [workflowStepConstants.revokeDeviceVerifyTransaction]: {
    kind: workflowStepConstants.revokeDeviceVerifyTransaction,
    readDataFrom: [workflowStepConstants.revokeDevicePerformTransaction],
    onFailure: workflowStepConstants.rollbackRevokeDeviceTransaction,
    onSuccess: [workflowStepConstants.markSuccess]
  },
  [workflowStepConstants.rollbackRevokeDeviceTransaction]: {
    kind: workflowStepConstants.rollbackRevokeDeviceTransaction,
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

module.exports = revokeDeviceStepsConfig;
