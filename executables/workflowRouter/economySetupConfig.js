'use strict';
/**
 * Class for Economy setup flow config.
 *
 * @module executables/workflowRouter/economySetupConfig
 */
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
    onSuccess: [workflowStepConstants.fundAuxFunderAddress]
  },
  [workflowStepConstants.fundAuxFunderAddress]: {
    kind: workflowStepConstants.fundAuxFunderAddress,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.verifyFundAuxFunderAddress]
  },
  [workflowStepConstants.verifyFundAuxFunderAddress]: {
    kind: workflowStepConstants.verifyFundAuxFunderAddress,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.fundAuxFunderAddress],
    onSuccess: [workflowStepConstants.fundAuxAdminAddress, workflowStepConstants.fundAuxWorkerAddress]
  },
  [workflowStepConstants.fundAuxAdminAddress]: {
    kind: workflowStepConstants.fundAuxAdminAddress,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.verifyFundAuxAdminAddress]
  },
  [workflowStepConstants.verifyFundAuxAdminAddress]: {
    kind: workflowStepConstants.verifyFundAuxAdminAddress,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.fundAuxFunderAddress],
    onSuccess: [workflowStepConstants.deployOriginTokenOrganization, workflowStepConstants.deployAuxTokenOrganization]
  },
  [workflowStepConstants.fundAuxWorkerAddress]: {
    kind: workflowStepConstants.fundAuxWorkerAddress,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.verifyFundAuxWorkerAddress]
  },
  [workflowStepConstants.verifyFundAuxWorkerAddress]: {
    kind: workflowStepConstants.verifyFundAuxWorkerAddress,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.fundAuxWorkerAddress],
    onSuccess: [workflowStepConstants.deployOriginTokenOrganization, workflowStepConstants.deployAuxTokenOrganization]
  },
  [workflowStepConstants.deployOriginTokenOrganization]: {
    kind: workflowStepConstants.deployOriginTokenOrganization,
    prerequisites: [workflowStepConstants.verifyFundAuxAdminAddress, workflowStepConstants.verifyFundAuxWorkerAddress],
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
    prerequisites: [workflowStepConstants.verifyFundAuxAdminAddress, workflowStepConstants.verifyFundAuxWorkerAddress],
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
    onSuccess: [workflowStepConstants.deployTokenGateway]
  },
  [workflowStepConstants.deployTokenGateway]: {
    kind: workflowStepConstants.deployTokenGateway,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.saveTokenGateway]
  },
  [workflowStepConstants.saveTokenGateway]: {
    kind: workflowStepConstants.saveTokenGateway,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.deployTokenGateway],
    onSuccess: [workflowStepConstants.updateTokenInOstView]
  },
  [workflowStepConstants.updateTokenInOstView]: {
    kind: workflowStepConstants.updateTokenInOstView,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.deployTokenCoGateway]
  },
  [workflowStepConstants.deployTokenCoGateway]: {
    kind: workflowStepConstants.deployTokenCoGateway,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.saveTokenCoGateway]
  },
  [workflowStepConstants.saveTokenCoGateway]: {
    kind: workflowStepConstants.saveTokenCoGateway,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.deployTokenCoGateway],
    onSuccess: [workflowStepConstants.activateTokenGateway]
  },
  [workflowStepConstants.activateTokenGateway]: {
    kind: workflowStepConstants.activateTokenGateway,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.verifyActivateTokenGateway]
  },
  [workflowStepConstants.verifyActivateTokenGateway]: {
    kind: workflowStepConstants.verifyActivateTokenGateway,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.activateTokenGateway],
    onSuccess: [
      workflowStepConstants.setCoGatewayInUbt,
      workflowStepConstants.setGatewayInBt,
      workflowStepConstants.deployGatewayComposer,
      workflowStepConstants.setInternalActorForOwnerInUBT
    ]
  },
  [workflowStepConstants.setCoGatewayInUbt]: {
    kind: workflowStepConstants.setCoGatewayInUbt,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.verifySetCoGatewayInUbt]
  },
  [workflowStepConstants.verifySetCoGatewayInUbt]: {
    kind: workflowStepConstants.verifySetCoGatewayInUbt,
    readDataFrom: [workflowStepConstants.setCoGatewayInUbt],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.verifyEconomySetup]
  },
  [workflowStepConstants.setGatewayInBt]: {
    kind: workflowStepConstants.setGatewayInBt,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.verifySetGatewayInBt]
  },
  [workflowStepConstants.verifySetGatewayInBt]: {
    kind: workflowStepConstants.verifySetGatewayInBt,
    readDataFrom: [workflowStepConstants.setGatewayInBt],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.verifyEconomySetup]
  },
  [workflowStepConstants.deployGatewayComposer]: {
    kind: workflowStepConstants.deployGatewayComposer,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.verifyDeployGatewayComposer]
  },
  [workflowStepConstants.verifyDeployGatewayComposer]: {
    kind: workflowStepConstants.verifyDeployGatewayComposer,
    readDataFrom: [workflowStepConstants.deployGatewayComposer],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.verifyEconomySetup]
  },
  [workflowStepConstants.setInternalActorForOwnerInUBT]: {
    kind: workflowStepConstants.setInternalActorForOwnerInUBT,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.verifySetInternalActorForOwnerInUBT]
  },
  [workflowStepConstants.verifySetInternalActorForOwnerInUBT]: {
    kind: workflowStepConstants.verifySetInternalActorForOwnerInUBT,
    readDataFrom: [workflowStepConstants.setInternalActorForOwnerInUBT],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.verifyEconomySetup]
  },
  [workflowStepConstants.verifyEconomySetup]: {
    kind: workflowStepConstants.verifyEconomySetup,
    prerequisites: [
      workflowStepConstants.verifySetCoGatewayInUbt,
      workflowStepConstants.verifySetGatewayInBt,
      workflowStepConstants.verifyDeployGatewayComposer,
      workflowStepConstants.verifySetInternalActorForOwnerInUBT
    ],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.markSuccess]
  },
  [workflowStepConstants.markSuccess]: {
    kind: workflowStepConstants.markSuccess,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: []
  }
};

module.exports = steps;
