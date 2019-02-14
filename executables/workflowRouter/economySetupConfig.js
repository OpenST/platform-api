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
    onSuccess: [workflowStepConstants.generateTxWorkerAddresses]
  },
  [workflowStepConstants.generateTxWorkerAddresses]: {
    kind: workflowStepConstants.generateTxWorkerAddresses,
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
    onSuccess: [workflowStepConstants.fundExTxWorkers]
  },
  [workflowStepConstants.fundExTxWorkers]: {
    kind: workflowStepConstants.fundExTxWorkers,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [
      workflowStepConstants.fundAuxAdminAddress,
      workflowStepConstants.fundAuxWorkerAddress,
      workflowStepConstants.fundTokenUserOpsWorker
    ]
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
  [workflowStepConstants.fundTokenUserOpsWorker]: {
    kind: workflowStepConstants.fundTokenUserOpsWorker,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.verifyFundTokenUserOpsWorker]
  },
  [workflowStepConstants.verifyFundTokenUserOpsWorker]: {
    kind: workflowStepConstants.verifyFundTokenUserOpsWorker,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.fundTokenUserOpsWorker],
    onSuccess: [workflowStepConstants.deployOriginTokenOrganization, workflowStepConstants.deployAuxTokenOrganization]
  },
  [workflowStepConstants.deployOriginTokenOrganization]: {
    kind: workflowStepConstants.deployOriginTokenOrganization,
    prerequisites: [
      workflowStepConstants.verifyFundAuxAdminAddress,
      workflowStepConstants.verifyFundAuxWorkerAddress,
      workflowStepConstants.verifyFundTokenUserOpsWorker
    ],
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
    prerequisites: [
      workflowStepConstants.verifyFundAuxAdminAddress,
      workflowStepConstants.verifyFundAuxWorkerAddress,
      workflowStepConstants.verifyFundTokenUserOpsWorker
    ],
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
      workflowStepConstants.setInternalActorForOwnerInUBT,
      workflowStepConstants.deployTokenRules,
      workflowStepConstants.deployTokenHolderMasterCopy,
      workflowStepConstants.deployUserWalletFactory,
      workflowStepConstants.deployGnosisSafeMultiSigMasterCopy
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
    onSuccess: [workflowStepConstants.deployPricerRule]
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
    onSuccess: [workflowStepConstants.deployPricerRule]
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
    onSuccess: [workflowStepConstants.deployPricerRule]
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
    onSuccess: [workflowStepConstants.deployPricerRule]
  },
  [workflowStepConstants.deployTokenRules]: {
    kind: workflowStepConstants.deployTokenRules,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.saveTokenRules]
  },
  [workflowStepConstants.saveTokenRules]: {
    kind: workflowStepConstants.saveTokenRules,
    readDataFrom: [workflowStepConstants.deployTokenRules],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.deployPricerRule]
  },
  [workflowStepConstants.deployTokenHolderMasterCopy]: {
    kind: workflowStepConstants.deployTokenHolderMasterCopy,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.saveTokenHolderMasterCopy]
  },
  [workflowStepConstants.saveTokenHolderMasterCopy]: {
    kind: workflowStepConstants.saveTokenHolderMasterCopy,
    readDataFrom: [workflowStepConstants.deployTokenHolderMasterCopy],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.deployPricerRule]
  },
  [workflowStepConstants.deployUserWalletFactory]: {
    kind: workflowStepConstants.deployUserWalletFactory,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.saveUserWalletFactory]
  },
  [workflowStepConstants.saveUserWalletFactory]: {
    kind: workflowStepConstants.saveUserWalletFactory,
    readDataFrom: [workflowStepConstants.deployUserWalletFactory],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.deployPricerRule]
  },
  [workflowStepConstants.deployGnosisSafeMultiSigMasterCopy]: {
    kind: workflowStepConstants.deployGnosisSafeMultiSigMasterCopy,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.saveGnosisSafeMultiSigMasterCopy]
  },
  [workflowStepConstants.saveGnosisSafeMultiSigMasterCopy]: {
    kind: workflowStepConstants.saveGnosisSafeMultiSigMasterCopy,
    readDataFrom: [workflowStepConstants.deployGnosisSafeMultiSigMasterCopy],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.deployPricerRule]
  },
  [workflowStepConstants.deployPricerRule]: {
    kind: workflowStepConstants.deployPricerRule,
    prerequisites: [
      workflowStepConstants.verifySetCoGatewayInUbt,
      workflowStepConstants.verifySetGatewayInBt,
      workflowStepConstants.verifyDeployGatewayComposer,
      workflowStepConstants.verifySetInternalActorForOwnerInUBT,
      workflowStepConstants.saveTokenRules,
      workflowStepConstants.saveTokenHolderMasterCopy,
      workflowStepConstants.saveUserWalletFactory,
      workflowStepConstants.saveGnosisSafeMultiSigMasterCopy
    ],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.savePricerRule]
  },
  [workflowStepConstants.savePricerRule]: {
    kind: workflowStepConstants.savePricerRule,
    readDataFrom: [workflowStepConstants.deployPricerRule],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [
      workflowStepConstants.registerPricerRule,
      workflowStepConstants.addPriceOracleInPricerRule,
      workflowStepConstants.setAcceptedMarginInPricerRule,
      workflowStepConstants.deployProxyFactory,
      workflowStepConstants.setInternalActorForTRInUBT
    ]
  },
  [workflowStepConstants.registerPricerRule]: {
    kind: workflowStepConstants.registerPricerRule,
    prerequisites: [workflowStepConstants.savePricerRule],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.verifyRegisterPricerRule]
  },
  [workflowStepConstants.verifyRegisterPricerRule]: {
    kind: workflowStepConstants.verifyRegisterPricerRule,
    readDataFrom: [workflowStepConstants.registerPricerRule],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.assignShards]
  },
  [workflowStepConstants.addPriceOracleInPricerRule]: {
    kind: workflowStepConstants.addPriceOracleInPricerRule,
    prerequisites: [workflowStepConstants.savePricerRule],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.verifyAddPriceOracleInPricerRule]
  },
  [workflowStepConstants.verifyAddPriceOracleInPricerRule]: {
    kind: workflowStepConstants.verifyAddPriceOracleInPricerRule,
    readDataFrom: [workflowStepConstants.addPriceOracleInPricerRule],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.assignShards]
  },
  [workflowStepConstants.setAcceptedMarginInPricerRule]: {
    kind: workflowStepConstants.setAcceptedMarginInPricerRule,
    prerequisites: [workflowStepConstants.savePricerRule],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.verifySetAcceptedMarginInPricerRule]
  },
  [workflowStepConstants.verifySetAcceptedMarginInPricerRule]: {
    kind: workflowStepConstants.verifySetAcceptedMarginInPricerRule,
    readDataFrom: [workflowStepConstants.setAcceptedMarginInPricerRule],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.assignShards]
  },
  [workflowStepConstants.deployProxyFactory]: {
    kind: workflowStepConstants.deployProxyFactory,
    prerequisites: [workflowStepConstants.savePricerRule],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.saveProxyFactory]
  },
  [workflowStepConstants.saveProxyFactory]: {
    kind: workflowStepConstants.saveProxyFactory,
    readDataFrom: [workflowStepConstants.deployProxyFactory],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.assignShards]
  },
  [workflowStepConstants.setInternalActorForTRInUBT]: {
    kind: workflowStepConstants.setInternalActorForTRInUBT,
    prerequisites: [workflowStepConstants.savePricerRule],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.verifySetInternalActorForTRInUBT]
  },
  [workflowStepConstants.verifySetInternalActorForTRInUBT]: {
    kind: workflowStepConstants.verifySetInternalActorForTRInUBT,
    readDataFrom: [workflowStepConstants.setInternalActorForTRInUBT],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.assignShards]
  },
  [workflowStepConstants.assignShards]: {
    kind: workflowStepConstants.assignShards,
    prerequisites: [
      workflowStepConstants.verifyRegisterPricerRule,
      workflowStepConstants.verifyAddPriceOracleInPricerRule,
      workflowStepConstants.verifySetAcceptedMarginInPricerRule,
      workflowStepConstants.saveProxyFactory,
      workflowStepConstants.verifySetInternalActorForTRInUBT
    ],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.initializeCompanyTokenHolderInDb]
  },
  [workflowStepConstants.initializeCompanyTokenHolderInDb]: {
    kind: workflowStepConstants.initializeCompanyTokenHolderInDb,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.createCompanyWallet]
  },
  [workflowStepConstants.createCompanyWallet]: {
    kind: workflowStepConstants.createCompanyWallet,
    readDataFrom: [workflowStepConstants.initializeCompanyTokenHolderInDb],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.verifyCreateCompanyWallet]
  },
  [workflowStepConstants.verifyCreateCompanyWallet]: {
    kind: workflowStepConstants.verifyCreateCompanyWallet,
    readDataFrom: [workflowStepConstants.initializeCompanyTokenHolderInDb],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.setInternalActorForCompanyTHInUBT]
  },
  [workflowStepConstants.setInternalActorForCompanyTHInUBT]: {
    kind: workflowStepConstants.setInternalActorForCompanyTHInUBT,
    readDataFrom: [workflowStepConstants.verifyCreateCompanyWallet],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.verifySetInternalActorForCompanyTHInUBT]
  },
  [workflowStepConstants.verifySetInternalActorForCompanyTHInUBT]: {
    kind: workflowStepConstants.verifySetInternalActorForCompanyTHInUBT,
    readDataFrom: [workflowStepConstants.setInternalActorForCompanyTHInUBT],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.verifyEconomySetup]
  },
  [workflowStepConstants.verifyEconomySetup]: {
    kind: workflowStepConstants.verifyEconomySetup,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.markSuccess]
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
