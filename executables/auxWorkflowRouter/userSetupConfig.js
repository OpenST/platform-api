'use strict';

const rootPrefix = '../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const steps = {
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
    onSuccess: []
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

module.exports = steps;