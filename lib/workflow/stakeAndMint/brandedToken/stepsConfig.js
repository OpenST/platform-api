'use strict';

const rootPrefix = '../../../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const btStakeAndMintStepsConfig = {
  [workflowStepConstants.btStakeAndMintInit]: {
    kind: workflowStepConstants.btStakeAndMintInit,
    onFailure: workflowStepConstants.sendStakeAndMintErrorEmail,
    onSuccess: [workflowStepConstants.recordOrSubmitApproveGCTx, workflowStepConstants.recordOrSubmitRequestStakeTx]
  },
  [workflowStepConstants.recordOrSubmitApproveGCTx]: {
    kind: workflowStepConstants.recordOrSubmitApproveGCTx,
    onFailure: workflowStepConstants.sendStakeAndMintErrorEmail,
    onSuccess: [workflowStepConstants.checkGatewayComposerAllowance]
  },
  [workflowStepConstants.checkGatewayComposerAllowance]: {
    kind: workflowStepConstants.checkGatewayComposerAllowance,
    onFailure: workflowStepConstants.sendStakeAndMintErrorEmail,
    readDataFrom: [workflowStepConstants.recordOrSubmitApproveGCTx],
    onSuccess: [workflowStepConstants.acceptStake]
  },
  [workflowStepConstants.recordOrSubmitRequestStakeTx]: {
    kind: workflowStepConstants.recordOrSubmitRequestStakeTx,
    onFailure: workflowStepConstants.sendStakeAndMintErrorEmail,
    onSuccess: [workflowStepConstants.fetchStakeRequestHash]
  },
  [workflowStepConstants.fetchStakeRequestHash]: {
    kind: workflowStepConstants.fetchStakeRequestHash,
    onFailure: workflowStepConstants.sendStakeAndMintErrorEmail,
    readDataFrom: [workflowStepConstants.recordOrSubmitRequestStakeTx],
    onSuccess: [workflowStepConstants.acceptStake]
  },
  [workflowStepConstants.acceptStake]: {
    kind: workflowStepConstants.acceptStake,
    onFailure: workflowStepConstants.sendStakeAndMintErrorEmail,
    readDataFrom: [workflowStepConstants.fetchStakeRequestHash],
    prerequisites: [workflowStepConstants.checkGatewayComposerAllowance, workflowStepConstants.fetchStakeRequestHash],
    onSuccess: [workflowStepConstants.checkStakeStatus]
  },
  [workflowStepConstants.checkStakeStatus]: {
    kind: workflowStepConstants.checkStakeStatus,
    onFailure: workflowStepConstants.sendStakeAndMintErrorEmail,
    readDataFrom: [workflowStepConstants.acceptStake],
    onSuccess: [workflowStepConstants.fetchStakeIntentMessageHash]
  },
  [workflowStepConstants.fetchStakeIntentMessageHash]: {
    kind: workflowStepConstants.fetchStakeIntentMessageHash,
    onFailure: workflowStepConstants.sendStakeAndMintErrorEmail,
    readDataFrom: [workflowStepConstants.acceptStake],
    onSuccess: [workflowStepConstants.commitStateRoot]
  },
  [workflowStepConstants.commitStateRoot]: {
    kind: workflowStepConstants.commitStateRoot,
    onFailure: workflowStepConstants.sendStakeAndMintErrorEmail,
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
    onFailure: workflowStepConstants.sendStakeAndMintErrorEmail,
    readDataFrom: [workflowStepConstants.updateCommittedStateRootInfo],
    onSuccess: [workflowStepConstants.checkProveGatewayStatus]
  },
  [workflowStepConstants.checkProveGatewayStatus]: {
    kind: workflowStepConstants.checkProveGatewayStatus,
    onFailure: workflowStepConstants.sendStakeAndMintErrorEmail,
    readDataFrom: [workflowStepConstants.proveGatewayOnCoGateway],
    onSuccess: [workflowStepConstants.confirmStakeIntent]
  },
  [workflowStepConstants.confirmStakeIntent]: {
    kind: workflowStepConstants.confirmStakeIntent,
    onFailure: workflowStepConstants.sendStakeAndMintErrorEmail,
    readDataFrom: [
      workflowStepConstants.fetchStakeRequestHash,
      workflowStepConstants.fetchStakeIntentMessageHash,
      workflowStepConstants.acceptStake,
      workflowStepConstants.proveGatewayOnCoGateway
    ],
    onSuccess: [workflowStepConstants.checkConfirmStakeStatus]
  },
  [workflowStepConstants.checkConfirmStakeStatus]: {
    kind: workflowStepConstants.checkConfirmStakeStatus,
    onFailure: workflowStepConstants.sendStakeAndMintErrorEmail,
    readDataFrom: [workflowStepConstants.fetchStakeIntentMessageHash, workflowStepConstants.confirmStakeIntent],
    onSuccess: [workflowStepConstants.progressStake]
  },
  [workflowStepConstants.progressStake]: {
    kind: workflowStepConstants.progressStake,
    onFailure: workflowStepConstants.sendStakeAndMintErrorEmail,
    readDataFrom: [workflowStepConstants.fetchStakeIntentMessageHash, workflowStepConstants.acceptStake],
    onSuccess: [workflowStepConstants.checkProgressStakeStatus]
  },
  [workflowStepConstants.checkProgressStakeStatus]: {
    kind: workflowStepConstants.checkProgressStakeStatus,
    onFailure: workflowStepConstants.sendStakeAndMintErrorEmail,
    readDataFrom: [workflowStepConstants.fetchStakeIntentMessageHash, workflowStepConstants.progressStake],
    onSuccess: [workflowStepConstants.progressMint]
  },
  [workflowStepConstants.progressMint]: {
    kind: workflowStepConstants.progressMint,
    onFailure: workflowStepConstants.sendStakeAndMintErrorEmail,
    readDataFrom: [workflowStepConstants.fetchStakeIntentMessageHash, workflowStepConstants.acceptStake],
    onSuccess: [workflowStepConstants.checkProgressMintStatus]
  },
  [workflowStepConstants.checkProgressMintStatus]: {
    kind: workflowStepConstants.checkProgressMintStatus,
    onFailure: workflowStepConstants.sendStakeAndMintErrorEmail,
    readDataFrom: [workflowStepConstants.fetchStakeIntentMessageHash, workflowStepConstants.progressMint],
    onSuccess: [workflowStepConstants.sendStakeAndMintSuccessEmail]
  },
  [workflowStepConstants.sendStakeAndMintSuccessEmail]: {
    kind: workflowStepConstants.sendStakeAndMintSuccessEmail,
    onFailure: workflowStepConstants.markSuccess, // showing leniency
    onSuccess: [workflowStepConstants.markSuccess]
  },
  [workflowStepConstants.sendStakeAndMintErrorEmail]: {
    kind: workflowStepConstants.sendStakeAndMintErrorEmail,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.markFailure]
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

module.exports = btStakeAndMintStepsConfig;
