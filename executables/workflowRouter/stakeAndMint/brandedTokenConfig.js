'use strict';

const rootPrefix = '../../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const steps = {
  [workflowStepConstants.btStakeAndMintInit]: {
    kind: workflowStepConstants.btStakeAndMintInit,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.btRequestStakeHandle]
  },
  [workflowStepConstants.btRequestStakeHandle]: {
    kind: workflowStepConstants.btRequestStakeHandle,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.checkRequestStakeTxStatus]
  },
  [workflowStepConstants.checkRequestStakeTxStatus]: {
    kind: workflowStepConstants.checkRequestStakeTxStatus,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.fetchStakeRequestHash]
  },
  [workflowStepConstants.fetchStakeRequestHash]: {
    kind: workflowStepConstants.fetchStakeRequestHash,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.btApproveTxHandle]
  },
  [workflowStepConstants.btApproveTxHandle]: {
    kind: workflowStepConstants.btApproveTxHandle,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.checkApproveTxStatus]
  },
  [workflowStepConstants.checkApproveTxStatus]: {
    kind: workflowStepConstants.checkApproveTxStatus,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.checkAllowance]
  },
  [workflowStepConstants.checkAllowance]: {
    kind: workflowStepConstants.checkAllowance,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: []
  }
};

module.exports = steps;
