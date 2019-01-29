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
    readDataFrom: [workflowStepConstants.approveGatewayComposerTrx],
    onSuccess: [workflowStepConstants.acceptStake]
  },
  [workflowStepConstants.stakerRequestStakeTrx]: {
    kind: workflowStepConstants.stakerRequestStakeTrx,
    onFailure: workflowStepConstants.markFailure,
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
    readDataFrom: [workflowStepConstants.fetchStakeRequestHash],
    prerequisites: [workflowStepConstants.checkGatewayComposerAllowance, workflowStepConstants.fetchStakeRequestHash],
    onSuccess: [workflowStepConstants.checkStakeStatus]
  },
  [workflowStepConstants.checkStakeStatus]: {
    kind: workflowStepConstants.checkStakeStatus,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.acceptStake],
    onSuccess: [workflowStepConstants.fetchStakeIntentMessageHash]
  },
  [workflowStepConstants.fetchStakeIntentMessageHash]: {
    kind: workflowStepConstants.fetchStakeIntentMessageHash,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.acceptStake],
    onSuccess: [workflowStepConstants.commitStateRoot]
  },
  [workflowStepConstants.commitStateRoot]: {
    kind: workflowStepConstants.commitStateRoot,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.fetchStakeIntentMessageHash],
    onSuccess: [workflowStepConstants.updateCommittedStateRootInfo]
  },
  [workflowStepConstants.updateCommittedStateRootInfo]: {
    kind: workflowStepConstants.updateCommittedStateRootInfo,
    readDataFrom: [workflowStepConstants.commitStateRoot],
    onSuccess: [workflowStepConstants.proveGatewayOnCoGateway]
  },
  [workflowStepConstants.proveGatewayOnCoGateway]: {
    kind: workflowStepConstants.proveGatewayOnCoGateway,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.checkProveGatewayStatus]
  },
  [workflowStepConstants.checkProveGatewayStatus]: {
    kind: workflowStepConstants.checkProveGatewayStatus,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.proveGatewayOnCoGateway],
    onSuccess: [workflowStepConstants.confirmStakeIntent]
  },
  [workflowStepConstants.confirmStakeIntent]: {
    kind: workflowStepConstants.confirmStakeIntent,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [
      workflowStepConstants.fetchStakeRequestHash,
      workflowStepConstants.fetchStakeIntentMessageHash,
      workflowStepConstants.acceptStake
    ],
    onSuccess: [workflowStepConstants.checkConfirmStakeStatus]
  },
  [workflowStepConstants.checkConfirmStakeStatus]: {
    kind: workflowStepConstants.checkConfirmStakeStatus,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.fetchStakeIntentMessageHash, workflowStepConstants.confirmStakeIntent],
    onSuccess: [workflowStepConstants.progressStake]
  },
  [workflowStepConstants.progressStake]: {
    kind: workflowStepConstants.progressStake,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.fetchStakeIntentMessageHash, workflowStepConstants.acceptStake],
    onSuccess: [workflowStepConstants.checkProgressStakeStatus]
  },
  [workflowStepConstants.checkProgressStakeStatus]: {
    kind: workflowStepConstants.checkProgressStakeStatus,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.fetchStakeIntentMessageHash, workflowStepConstants.progressStake],
    onSuccess: [workflowStepConstants.progressMint]
  },
  [workflowStepConstants.progressMint]: {
    kind: workflowStepConstants.progressMint,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.fetchStakeIntentMessageHash, workflowStepConstants.acceptStake],
    onSuccess: [workflowStepConstants.checkProgressMintStatus]
  },
  [workflowStepConstants.checkProgressMintStatus]: {
    kind: workflowStepConstants.checkProgressMintStatus,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.fetchStakeIntentMessageHash, workflowStepConstants.progressMint],
    onSuccess: [workflowStepConstants.markSuccess]
  },
  [workflowStepConstants.markSuccess]: {
    kind: workflowStepConstants.markSuccess,
    onSuccess: []
  },
  [workflowStepConstants.markFailure]: {
    kind: workflowStepConstants.markFailure,
    onSuccess: []
  }
};

module.exports = steps;
