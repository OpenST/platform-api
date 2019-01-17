'use strict';

const rootPrefix = '../../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const steps = {
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
    prerequisites: [workflowStepConstants.checkApproveStatus],
    onSuccess: [workflowStepConstants.commitStateRootInit]
  },
  [workflowStepConstants.checkStakeStatus]: {
    kind: workflowStepConstants.checkStakeStatus,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.simpleTokenStake],
    onSuccess: [workflowStepConstants.commitStateRootInit]
  },
  [workflowStepConstants.commitStateRoot]: {
    kind: workflowStepConstants.commitStateRoot,
    onFailure: '',
    prerequisites: [workflowStepConstants.checkStakeStatus],
    onSuccess: [workflowStepConstants.updateCommittedStateRootInfo]
  },
  [workflowStepConstants.updateCommittedStateRootInfo]: {
    kind: workflowStepConstants.updateCommittedStateRootInfo,
    onFailure: '',
    readDataFrom: [workflowStepConstants.commitStateRoot],
    onSuccess: [workflowStepConstants.stPrimeProveGateway]
  },
  [workflowStepConstants.stPrimeProveGateway]: {
    kind: workflowStepConstants.stPrimeProveGateway,
    onFailure: workflowStepConstants.markFailure,
    prerequisites: [workflowStepConstants.updateCommittedStateRootInfo],
    onSuccess: [workflowStepConstants.checkProveGatewayStatus]
  },
  [workflowStepConstants.checkProveGatewayStatus]: {
    kind: workflowStepConstants.checkProveGatewayStatus,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.stPrimeConfirmStakeIntent]
  },
  [workflowStepConstants.stPrimeConfirmStakeIntent]: {
    kind: workflowStepConstants.stPrimeConfirmStakeIntent,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.stPrimeConfirmStakeIntent]
  },
  [workflowStepConstants.checkConfirmStakeStatus]: {
    kind: workflowStepConstants.checkConfirmStakeStatus,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.stPrimeProgressStake]
  },
  [workflowStepConstants.stPrimeProgressStake]: {
    kind: workflowStepConstants.stPrimeProgressStake,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.stPrimeProgressMint]
  },
  [workflowStepConstants.checkProgressStakeStatus]: {
    kind: workflowStepConstants.checkProgressStakeStatus,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.stPrimeProgressMint]
  },
  [workflowStepConstants.stPrimeProgressMint]: {
    kind: workflowStepConstants.stPrimeProgressMint,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: []
  }
};

module.exports = steps;
