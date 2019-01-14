'use strict';

const rootPrefix = '../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const steps = {
  [workflowStepConstants.economySetupInit]: {
    kind: workflowStepConstants.economySetupInit,
    onFailure: '',
    onSuccess: [workflowStepConstants.generateTokenAddresses]
  },
  [workflowStepConstants.generateTokenAddresses]: {
    kind: workflowStepConstants.generateTokenAddresses,
    onFailure: '',
    onSuccess: [workflowStepConstants.deployOriginTokenOrganization]
  },
  [workflowStepConstants.deployOriginTokenOrganization]: {
    kind: workflowStepConstants.deployOriginTokenOrganization,
    onFailure: '',
    onSuccess: [workflowStepConstants.deployOriginBrandedToken]
  },
  [workflowStepConstants.deployOriginBrandedToken]: {
    kind: workflowStepConstants.deployOriginBrandedToken,
    onFailure: '',
    readDataFrom: [workflowStepConstants.deployOriginTokenOrganization],
    onSuccess: [workflowStepConstants.deployAuxTokenOrganization]
  },
  [workflowStepConstants.deployAuxTokenOrganization]: {
    kind: workflowStepConstants.deployAuxTokenOrganization,
    onFailure: '',
    onSuccess: [workflowStepConstants.deployUtilityBrandedToken]
  },
  [workflowStepConstants.deployUtilityBrandedToken]: {
    kind: workflowStepConstants.deployUtilityBrandedToken,
    onFailure: '',
    readDataFrom: [workflowStepConstants.deployOriginBrandedToken, workflowStepConstants.deployAuxTokenOrganization],
    onSuccess: [workflowStepConstants.tokenDeployGateway]
  },
  [workflowStepConstants.tokenDeployGateway]: {
    kind: workflowStepConstants.tokenDeployGateway,
    onFailure: '',
    onSuccess: [workflowStepConstants.tokenDeployCoGateway]
  },
  [workflowStepConstants.tokenDeployCoGateway]: {
    kind: workflowStepConstants.tokenDeployCoGateway,
    onFailure: '',
    onSuccess: [workflowStepConstants.activateTokenGateway]
  },
  [workflowStepConstants.activateTokenGateway]: {
    kind: workflowStepConstants.activateTokenGateway,
    onFailure: '',
    onSuccess: [workflowStepConstants.setCoGatewayInUbt]
  },
  [workflowStepConstants.setCoGatewayInUbt]: {
    kind: workflowStepConstants.setCoGatewayInUbt,
    onFailure: '',
    readDataFrom: [workflowStepConstants.deployUtilityBrandedToken, workflowStepConstants.tokenDeployCoGateway],
    onSuccess: [workflowStepConstants.setGatewayInBt]
  },
  [workflowStepConstants.setGatewayInBt]: {
    kind: workflowStepConstants.setGatewayInBt,
    onFailure: '',
    readDataFrom: [workflowStepConstants.deployOriginBrandedToken, workflowStepConstants.tokenDeployGateway],
    onSuccess: []
  }
};

module.exports = steps;
