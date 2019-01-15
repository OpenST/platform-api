'use strict';

const rootPrefix = '../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

//NOTE: These steps are also used in KIT-API for showing progress. Any change here would have to be synced with KIT-API.

const steps = {
  [workflowStepConstants.economySetupInit]: {
    kind: workflowStepConstants.economySetupInit,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.generateTokenAddresses]
  },
  [workflowStepConstants.generateTokenAddresses]: {
    kind: workflowStepConstants.generateTokenAddresses,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.deployOriginTokenOrganization, workflowStepConstants.deployAuxTokenOrganization]
  },
  [workflowStepConstants.deployOriginTokenOrganization]: {
    kind: workflowStepConstants.deployOriginTokenOrganization,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.saveOriginTokenOrganization]
  },
  [workflowStepConstants.saveOriginTokenOrganization]: {
    kind: workflowStepConstants.saveOriginTokenOrganization,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.deployOriginTokenOrganization],
    onSuccess: [workflowStepConstants.deployOriginBrandedToken]
  },
  [workflowStepConstants.deployOriginBrandedToken]: {
    kind: workflowStepConstants.deployOriginBrandedToken,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [],
    onSuccess: [workflowStepConstants.saveOriginBrandedToken]
  },
  [workflowStepConstants.saveOriginBrandedToken]: {
    kind: workflowStepConstants.saveOriginBrandedToken,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.deployOriginBrandedToken],
    onSuccess: [workflowStepConstants.deployUtilityBrandedToken]
  },
  [workflowStepConstants.deployAuxTokenOrganization]: {
    kind: workflowStepConstants.deployAuxTokenOrganization,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.saveAuxTokenOrganization]
  },
  [workflowStepConstants.saveAuxTokenOrganization]: {
    kind: workflowStepConstants.saveAuxTokenOrganization,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.deployAuxTokenOrganization],
    onSuccess: [workflowStepConstants.deployUtilityBrandedToken]
  },
  [workflowStepConstants.deployUtilityBrandedToken]: {
    kind: workflowStepConstants.deployUtilityBrandedToken,
    onFailure: workflowStepConstants.markFailure,
    prerequisites: [workflowStepConstants.saveOriginBrandedToken, workflowStepConstants.saveAuxTokenOrganization],
    onSuccess: [workflowStepConstants.saveUtilityBrandedToken]
  },
  [workflowStepConstants.saveUtilityBrandedToken]: {
    kind: workflowStepConstants.saveUtilityBrandedToken,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.deployUtilityBrandedToken],
    onSuccess: [workflowStepConstants.tokenDeployGateway]
  },
  [workflowStepConstants.tokenDeployGateway]: {
    kind: workflowStepConstants.tokenDeployGateway,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.saveTokenGateway]
  },
  [workflowStepConstants.saveTokenGateway]: {
    kind: workflowStepConstants.saveTokenGateway,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.tokenDeployGateway],
    onSuccess: [workflowStepConstants.updateTokenInOstView]
  },
  [workflowStepConstants.updateTokenInOstView]: {
    kind: workflowStepConstants.updateTokenInOstView,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.tokenDeployCoGateway]
  },
  [workflowStepConstants.tokenDeployCoGateway]: {
    kind: workflowStepConstants.tokenDeployCoGateway,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.saveTokenCoGateway]
  },
  [workflowStepConstants.saveTokenCoGateway]: {
    kind: workflowStepConstants.saveTokenCoGateway,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.tokenDeployCoGateway],
    onSuccess: [workflowStepConstants.activateTokenGateway]
  },
  [workflowStepConstants.activateTokenGateway]: {
    kind: workflowStepConstants.activateTokenGateway,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.setCoGatewayInUbt, workflowStepConstants.setGatewayInBt]
  },
  [workflowStepConstants.setCoGatewayInUbt]: {
    kind: workflowStepConstants.setCoGatewayInUbt,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.markSuccess]
  },
  [workflowStepConstants.setGatewayInBt]: {
    kind: workflowStepConstants.setGatewayInBt,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.markSuccess]
  },
  [workflowStepConstants.markSuccess]: {
    kind: workflowStepConstants.markSuccess,
    onFailure: workflowStepConstants.markFailure,
    prerequisites: [workflowStepConstants.setCoGatewayInUbt, workflowStepConstants.setGatewayInBt],
    onSuccess: []
  }
};

module.exports = steps;
