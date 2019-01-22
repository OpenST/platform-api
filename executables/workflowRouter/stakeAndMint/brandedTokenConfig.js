'use strict';

const rootPrefix = '../../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const steps = {
  [workflowStepConstants.btStakeAndMintInit]: {
    kind: workflowStepConstants.btStakeAndMintInit,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.approveGatewayComposerTrx, workflowStepConstants.stakerRequestStakeTrx]
  },
  [workflowStepConstants.approveGatewayComposerTrx]: {
    kind: workflowStepConstants.approveGatewayComposerTrx,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.checkGatewayComposerAllowance]
  },
  [workflowStepConstants.checkGatewayComposerAllowance]: {
    kind: workflowStepConstants.checkGatewayComposerAllowance,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.acceptStake]
  },
  [workflowStepConstants.stakerRequestStakeTrx]: {
    kind: workflowStepConstants.stakerRequestStakeTrx,
    onFailure: '',
    onSuccess: [workflowStepConstants.fetchStakeRequestHash]
  },
  [workflowStepConstants.fetchStakeRequestHash]: {
    kind: workflowStepConstants.fetchStakeRequestHash,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.stakerRequestStakeTrx],
    onSuccess: [workflowStepConstants.acceptStake]
  },
  [workflowStepConstants.acceptStake]: {
    kind: workflowStepConstants.acceptStake,
    onFailure: workflowStepConstants.markFailure,
    prerequisites: [workflowStepConstants.checkGatewayComposerAllowance, workflowStepConstants.fetchStakeRequestHash],
    onSuccess: []
  }
};

module.exports = steps;
