/**
 * Module for user setup steps config.
 *
 * @module lib/workflow/userSetup/stepsConfig
 */

const rootPrefix = '../../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const userSetupStepsConfig = {
  [workflowStepConstants.userSetupInit]: {
    kind: workflowStepConstants.userSetupInit,
    onFailure: '',
    onSuccess: [workflowStepConstants.addSessionAddresses]
  },
  [workflowStepConstants.addSessionAddresses]: {
    kind: workflowStepConstants.addSessionAddresses,
    onFailure: workflowStepConstants.rollbackUserSetup,
    onSuccess: [workflowStepConstants.addUserInWalletFactory]
  },
  [workflowStepConstants.addUserInWalletFactory]: {
    kind: workflowStepConstants.addUserInWalletFactory,
    onFailure: workflowStepConstants.rollbackUserSetup,
    onSuccess: [workflowStepConstants.fetchRegisteredUserEvent]
  },
  [workflowStepConstants.fetchRegisteredUserEvent]: {
    kind: workflowStepConstants.fetchRegisteredUserEvent,
    onFailure: workflowStepConstants.rollbackUserSetup,
    readDataFrom: [workflowStepConstants.addUserInWalletFactory],
    onSuccess: [workflowStepConstants.setInternalActorForTokenHolderInUBT]
  },
  [workflowStepConstants.setInternalActorForTokenHolderInUBT]: {
    kind: workflowStepConstants.setInternalActorForTokenHolderInUBT,
    onFailure: workflowStepConstants.rollbackUserSetup,
    readDataFrom: [workflowStepConstants.fetchRegisteredUserEvent],
    onSuccess: [workflowStepConstants.verifyInternalActorTransactionInUBT]
  },
  [workflowStepConstants.verifyInternalActorTransactionInUBT]: {
    kind: workflowStepConstants.verifyInternalActorTransactionInUBT,
    onFailure: workflowStepConstants.rollbackUserSetup,
    readDataFrom: [workflowStepConstants.setInternalActorForTokenHolderInUBT],
    onSuccess: [workflowStepConstants.activateUser]
  },
  [workflowStepConstants.activateUser]: {
    kind: workflowStepConstants.activateUser,
    onFailure: workflowStepConstants.rollbackUserSetup,
    readDataFrom: [workflowStepConstants.fetchRegisteredUserEvent],
    onSuccess: [workflowStepConstants.markSuccess]
  },
  [workflowStepConstants.rollbackUserSetup]: {
    kind: workflowStepConstants.rollbackUserSetup,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.markFailure]
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

module.exports = userSetupStepsConfig;
