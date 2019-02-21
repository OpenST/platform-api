'use strict';

const rootPrefix = '../../../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const stPrimeStakeAndMintStepsConfig = {
  [workflowStepConstants.stPrimeStakeAndMintInit]: {
    kind: workflowStepConstants.stPrimeStakeAndMintInit,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.stPrimeApprove]
  },
  [workflowStepConstants.stPrimeApprove]: {
    kind: workflowStepConstants.stPrimeStakeAndMintInit,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.checkApproveStatus]
  },
  [workflowStepConstants.checkApproveStatus]: {
    kind: workflowStepConstants.checkApproveStatus,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.stPrimeApprove],
    onSuccess: [workflowStepConstants.simpleTokenStake]
  },
  [workflowStepConstants.simpleTokenStake]: {
    kind: workflowStepConstants.simpleTokenStake,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.checkStakeStatus]
  },
  [workflowStepConstants.checkStakeStatus]: {
    kind: workflowStepConstants.checkStakeStatus,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.simpleTokenStake],
    onSuccess: [workflowStepConstants.fetchStakeIntentMessageHash]
  },
  [workflowStepConstants.fetchStakeIntentMessageHash]: {
    kind: workflowStepConstants.fetchStakeIntentMessageHash,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.simpleTokenStake],
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
    readDataFrom: [workflowStepConstants.fetchStakeIntentMessageHash, workflowStepConstants.simpleTokenStake],
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
    readDataFrom: [workflowStepConstants.fetchStakeIntentMessageHash, workflowStepConstants.simpleTokenStake],
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
    readDataFrom: [workflowStepConstants.fetchStakeIntentMessageHash, workflowStepConstants.simpleTokenStake],
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

module.exports = stPrimeStakeAndMintStepsConfig;
