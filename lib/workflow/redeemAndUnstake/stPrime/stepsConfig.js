'use strict';

const rootPrefix = '../../../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const stPrimeRedeemAndUnstakeStepsConfig = {
  [workflowStepConstants.stPrimeRedeemAndUnstakeInit]: {
    kind: workflowStepConstants.stPrimeRedeemAndUnstakeInit,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.stPrimeWrapAsBT]
  },
  [workflowStepConstants.stPrimeWrapAsBT]: {
    kind: workflowStepConstants.stPrimeWrapAsBT,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.checkWrapStPrimeStatus]
  },
  [workflowStepConstants.checkWrapStPrimeStatus]: {
    kind: workflowStepConstants.checkWrapStPrimeStatus,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.stPrimeWrapAsBT],
    onSuccess: [workflowStepConstants.stPrimeApproveCoGateway]
  },
  [workflowStepConstants.stPrimeApproveCoGateway]: {
    kind: workflowStepConstants.stPrimeApproveCoGateway,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.checkApproveCoGatewayStatus]
  },
  [workflowStepConstants.checkApproveCoGatewayStatus]: {
    kind: workflowStepConstants.checkApproveCoGatewayStatus,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.stPrimeApproveCoGateway],
    onSuccess: [workflowStepConstants.stPrimeRedeem]
  },
  [workflowStepConstants.stPrimeRedeem]: {
    kind: workflowStepConstants.stPrimeRedeem,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.checkRedeemStatus]
  },
  [workflowStepConstants.checkRedeemStatus]: {
    kind: workflowStepConstants.checkRedeemStatus,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.stPrimeRedeem],
    onSuccess: [workflowStepConstants.fetchRedeemIntentMessageHash]
  },
  [workflowStepConstants.fetchRedeemIntentMessageHash]: {
    kind: workflowStepConstants.fetchRedeemIntentMessageHash,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.stPrimeRedeem],
    onSuccess: [workflowStepConstants.commitStateRoot]
  },
  [workflowStepConstants.commitStateRoot]: {
    kind: workflowStepConstants.commitStateRoot,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.fetchRedeemIntentMessageHash],
    onSuccess: [workflowStepConstants.updateCommittedStateRootInfo]
  },
  [workflowStepConstants.updateCommittedStateRootInfo]: {
    kind: workflowStepConstants.updateCommittedStateRootInfo,
    readDataFrom: [workflowStepConstants.commitStateRoot],
    onSuccess: [workflowStepConstants.proveCoGatewayOnGateway]
  },
  [workflowStepConstants.proveCoGatewayOnGateway]: {
    kind: workflowStepConstants.proveCoGatewayOnGateway,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [
      workflowStepConstants.fetchRedeemIntentMessageHash,
      workflowStepConstants.updateCommittedStateRootInfo
    ],
    onSuccess: [workflowStepConstants.checkProveCoGatewayStatus]
  },
  [workflowStepConstants.checkProveCoGatewayStatus]: {
    kind: workflowStepConstants.checkProveCoGatewayStatus,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.proveCoGatewayOnGateway],
    onSuccess: [workflowStepConstants.confirmRedeemIntent]
  },
  [workflowStepConstants.confirmRedeemIntent]: {
    kind: workflowStepConstants.confirmRedeemIntent,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [
      workflowStepConstants.fetchRedeemIntentMessageHash,
      workflowStepConstants.stPrimeRedeem,
      workflowStepConstants.proveCoGatewayOnGateway
    ],
    onSuccess: [workflowStepConstants.checkConfirmRedeemStatus]
  },
  [workflowStepConstants.checkConfirmRedeemStatus]: {
    kind: workflowStepConstants.checkConfirmRedeemStatus,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.fetchRedeemIntentMessageHash, workflowStepConstants.confirmRedeemIntent],
    onSuccess: [workflowStepConstants.progressRedeem]
  },
  [workflowStepConstants.progressRedeem]: {
    kind: workflowStepConstants.progressRedeem,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.fetchRedeemIntentMessageHash, workflowStepConstants.stPrimeRedeem],
    onSuccess: [workflowStepConstants.checkProgressRedeemStatus]
  },
  [workflowStepConstants.checkProgressRedeemStatus]: {
    kind: workflowStepConstants.checkProgressRedeemStatus,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.fetchRedeemIntentMessageHash, workflowStepConstants.progressRedeem],
    onSuccess: [workflowStepConstants.progressUnstake]
  },
  [workflowStepConstants.progressUnstake]: {
    kind: workflowStepConstants.progressUnstake,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.fetchRedeemIntentMessageHash, workflowStepConstants.stPrimeRedeem],
    onSuccess: [workflowStepConstants.checkProgressUnstakeStatus]
  },
  [workflowStepConstants.checkProgressUnstakeStatus]: {
    kind: workflowStepConstants.checkProgressUnstakeStatus,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.fetchRedeemIntentMessageHash, workflowStepConstants.progressUnstake],
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

module.exports = stPrimeRedeemAndUnstakeStepsConfig;
