/**
 * Class for Economy setup flow config.
 *
 * @module lib/workflow/economySetup/stepsConfig
 */
const rootPrefix = '../../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

// NOTE: These steps are also used in KIT-API for showing progress. Any change here would have to be synced with KIT-API.

const economySetupStepsConfig = {
  [workflowStepConstants.economySetupInit]: {
    kind: workflowStepConstants.economySetupInit,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.generateTokenAddresses]
  },
  [workflowStepConstants.generateTokenAddresses]: {
    kind: workflowStepConstants.generateTokenAddresses,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.generateTxWorkerAddresses]
  },
  [workflowStepConstants.generateTxWorkerAddresses]: {
    kind: workflowStepConstants.generateTxWorkerAddresses,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.fundAuxFunderAddress]
  },
  [workflowStepConstants.fundAuxFunderAddress]: {
    kind: workflowStepConstants.fundAuxFunderAddress,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.verifyFundAuxFunderAddress]
  },
  [workflowStepConstants.verifyFundAuxFunderAddress]: {
    kind: workflowStepConstants.verifyFundAuxFunderAddress,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    readDataFrom: [workflowStepConstants.fundAuxFunderAddress],
    onSuccess: [workflowStepConstants.fundExTxWorkers]
  },
  [workflowStepConstants.fundExTxWorkers]: {
    kind: workflowStepConstants.fundExTxWorkers,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [
      workflowStepConstants.fundAuxAdminAddress,
      workflowStepConstants.fundAuxWorkerAddress,
      workflowStepConstants.fundTokenUserOpsWorker
    ]
  },
  [workflowStepConstants.fundAuxAdminAddress]: {
    kind: workflowStepConstants.fundAuxAdminAddress,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.verifyFundAuxAdminAddress]
  },
  [workflowStepConstants.verifyFundAuxAdminAddress]: {
    kind: workflowStepConstants.verifyFundAuxAdminAddress,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    readDataFrom: [workflowStepConstants.fundAuxFunderAddress],
    onSuccess: [workflowStepConstants.deployOriginTokenOrganization, workflowStepConstants.deployAuxTokenOrganization]
  },
  [workflowStepConstants.fundAuxWorkerAddress]: {
    kind: workflowStepConstants.fundAuxWorkerAddress,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.verifyFundAuxWorkerAddress]
  },
  [workflowStepConstants.verifyFundAuxWorkerAddress]: {
    kind: workflowStepConstants.verifyFundAuxWorkerAddress,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    readDataFrom: [workflowStepConstants.fundAuxWorkerAddress],
    onSuccess: [workflowStepConstants.deployOriginTokenOrganization, workflowStepConstants.deployAuxTokenOrganization]
  },
  [workflowStepConstants.fundTokenUserOpsWorker]: {
    kind: workflowStepConstants.fundTokenUserOpsWorker,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.verifyFundTokenUserOpsWorker]
  },
  [workflowStepConstants.verifyFundTokenUserOpsWorker]: {
    kind: workflowStepConstants.verifyFundTokenUserOpsWorker,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
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
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.saveOriginTokenOrganization]
  },
  [workflowStepConstants.saveOriginTokenOrganization]: {
    kind: workflowStepConstants.saveOriginTokenOrganization,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    readDataFrom: [workflowStepConstants.deployOriginTokenOrganization],
    onSuccess: [workflowStepConstants.deployOriginBrandedToken]
  },
  [workflowStepConstants.deployOriginBrandedToken]: {
    kind: workflowStepConstants.deployOriginBrandedToken,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    readDataFrom: [],
    onSuccess: [workflowStepConstants.saveOriginBrandedToken]
  },
  [workflowStepConstants.saveOriginBrandedToken]: {
    kind: workflowStepConstants.saveOriginBrandedToken,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
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
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.saveAuxTokenOrganization]
  },
  [workflowStepConstants.saveAuxTokenOrganization]: {
    kind: workflowStepConstants.saveAuxTokenOrganization,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    readDataFrom: [workflowStepConstants.deployAuxTokenOrganization],
    onSuccess: [workflowStepConstants.deployUtilityBrandedToken]
  },
  [workflowStepConstants.deployUtilityBrandedToken]: {
    kind: workflowStepConstants.deployUtilityBrandedToken,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    prerequisites: [workflowStepConstants.saveOriginBrandedToken, workflowStepConstants.saveAuxTokenOrganization],
    onSuccess: [workflowStepConstants.saveUtilityBrandedToken]
  },
  [workflowStepConstants.saveUtilityBrandedToken]: {
    kind: workflowStepConstants.saveUtilityBrandedToken,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    readDataFrom: [workflowStepConstants.deployUtilityBrandedToken],
    onSuccess: [workflowStepConstants.deployTokenGateway]
  },
  [workflowStepConstants.deployTokenGateway]: {
    kind: workflowStepConstants.deployTokenGateway,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.saveTokenGateway]
  },
  [workflowStepConstants.saveTokenGateway]: {
    kind: workflowStepConstants.saveTokenGateway,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    readDataFrom: [workflowStepConstants.deployTokenGateway],
    onSuccess: [workflowStepConstants.updateTokenInOstView]
  },
  [workflowStepConstants.updateTokenInOstView]: {
    kind: workflowStepConstants.updateTokenInOstView,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.deployTokenCoGateway]
  },
  [workflowStepConstants.deployTokenCoGateway]: {
    kind: workflowStepConstants.deployTokenCoGateway,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.saveTokenCoGateway]
  },
  [workflowStepConstants.saveTokenCoGateway]: {
    kind: workflowStepConstants.saveTokenCoGateway,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    readDataFrom: [workflowStepConstants.deployTokenCoGateway],
    onSuccess: [
      workflowStepConstants.setCoGatewayInUbt,
      workflowStepConstants.setGatewayInBt,
      workflowStepConstants.deployGatewayComposer,
      workflowStepConstants.setInternalActorForOwnerInUBT,
      workflowStepConstants.setInternalActorForFacilitatorInUBT,
      workflowStepConstants.deployTokenRules,
      workflowStepConstants.deployTokenHolderMasterCopy,
      workflowStepConstants.deployUserWalletFactory,
      workflowStepConstants.deployGnosisSafeMultiSigMasterCopy,
      workflowStepConstants.deployDelayedRecoveryModuleMasterCopy,
      workflowStepConstants.deployCreateAndAddModules
    ]
  },
  [workflowStepConstants.setCoGatewayInUbt]: {
    kind: workflowStepConstants.setCoGatewayInUbt,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.verifySetCoGatewayInUbt]
  },
  [workflowStepConstants.verifySetCoGatewayInUbt]: {
    kind: workflowStepConstants.verifySetCoGatewayInUbt,
    readDataFrom: [workflowStepConstants.setCoGatewayInUbt],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.deployPricerRule]
  },
  [workflowStepConstants.setGatewayInBt]: {
    kind: workflowStepConstants.setGatewayInBt,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.verifySetGatewayInBt]
  },
  [workflowStepConstants.verifySetGatewayInBt]: {
    kind: workflowStepConstants.verifySetGatewayInBt,
    readDataFrom: [workflowStepConstants.setGatewayInBt],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.deployPricerRule]
  },
  [workflowStepConstants.deployGatewayComposer]: {
    kind: workflowStepConstants.deployGatewayComposer,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.verifyDeployGatewayComposer]
  },
  [workflowStepConstants.verifyDeployGatewayComposer]: {
    kind: workflowStepConstants.verifyDeployGatewayComposer,
    readDataFrom: [workflowStepConstants.deployGatewayComposer],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.deployPricerRule]
  },
  [workflowStepConstants.setInternalActorForOwnerInUBT]: {
    kind: workflowStepConstants.setInternalActorForOwnerInUBT,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.verifySetInternalActorForOwnerInUBT]
  },
  [workflowStepConstants.verifySetInternalActorForOwnerInUBT]: {
    kind: workflowStepConstants.verifySetInternalActorForOwnerInUBT,
    readDataFrom: [workflowStepConstants.setInternalActorForOwnerInUBT],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.deployPricerRule]
  },
  [workflowStepConstants.setInternalActorForFacilitatorInUBT]: {
    kind: workflowStepConstants.setInternalActorForFacilitatorInUBT,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.verifySetInternalActorForFacilitatorInUBT]
  },
  [workflowStepConstants.verifySetInternalActorForFacilitatorInUBT]: {
    kind: workflowStepConstants.verifySetInternalActorForFacilitatorInUBT,
    readDataFrom: [workflowStepConstants.setInternalActorForFacilitatorInUBT],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.deployPricerRule]
  },
  [workflowStepConstants.deployTokenRules]: {
    kind: workflowStepConstants.deployTokenRules,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.saveTokenRules, workflowStepConstants.postTokenRuleDeploy]
  },
  [workflowStepConstants.saveTokenRules]: {
    kind: workflowStepConstants.saveTokenRules,
    readDataFrom: [workflowStepConstants.deployTokenRules],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.deployPricerRule]
  },
  [workflowStepConstants.postTokenRuleDeploy]: {
    kind: workflowStepConstants.postTokenRuleDeploy,
    readDataFrom: [workflowStepConstants.deployTokenRules],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.deployPricerRule]
  },
  [workflowStepConstants.deployTokenHolderMasterCopy]: {
    kind: workflowStepConstants.deployTokenHolderMasterCopy,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.saveTokenHolderMasterCopy]
  },
  [workflowStepConstants.saveTokenHolderMasterCopy]: {
    kind: workflowStepConstants.saveTokenHolderMasterCopy,
    readDataFrom: [workflowStepConstants.deployTokenHolderMasterCopy],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.deployPricerRule]
  },
  [workflowStepConstants.deployUserWalletFactory]: {
    kind: workflowStepConstants.deployUserWalletFactory,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.saveUserWalletFactory]
  },
  [workflowStepConstants.saveUserWalletFactory]: {
    kind: workflowStepConstants.saveUserWalletFactory,
    readDataFrom: [workflowStepConstants.deployUserWalletFactory],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.deployPricerRule]
  },
  [workflowStepConstants.deployGnosisSafeMultiSigMasterCopy]: {
    kind: workflowStepConstants.deployGnosisSafeMultiSigMasterCopy,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.saveGnosisSafeMultiSigMasterCopy]
  },
  [workflowStepConstants.saveGnosisSafeMultiSigMasterCopy]: {
    kind: workflowStepConstants.saveGnosisSafeMultiSigMasterCopy,
    readDataFrom: [workflowStepConstants.deployGnosisSafeMultiSigMasterCopy],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.deployPricerRule]
  },
  [workflowStepConstants.deployDelayedRecoveryModuleMasterCopy]: {
    kind: workflowStepConstants.deployDelayedRecoveryModuleMasterCopy,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.saveDelayedRecoveryModuleMasterCopy]
  },
  [workflowStepConstants.saveDelayedRecoveryModuleMasterCopy]: {
    kind: workflowStepConstants.saveDelayedRecoveryModuleMasterCopy,
    readDataFrom: [workflowStepConstants.deployDelayedRecoveryModuleMasterCopy],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.deployPricerRule]
  },
  [workflowStepConstants.deployCreateAndAddModules]: {
    kind: workflowStepConstants.deployCreateAndAddModules,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.saveCreateAndAddModules]
  },
  [workflowStepConstants.saveCreateAndAddModules]: {
    kind: workflowStepConstants.saveCreateAndAddModules,
    readDataFrom: [workflowStepConstants.deployCreateAndAddModules],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.fundRecoveryControllerAddress]
  },
  [workflowStepConstants.fundRecoveryControllerAddress]: {
    kind: workflowStepConstants.fundRecoveryControllerAddress,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.deployPricerRule]
  },
  [workflowStepConstants.deployPricerRule]: {
    kind: workflowStepConstants.deployPricerRule,
    prerequisites: [
      workflowStepConstants.verifySetCoGatewayInUbt,
      workflowStepConstants.verifySetGatewayInBt,
      workflowStepConstants.verifyDeployGatewayComposer,
      workflowStepConstants.verifySetInternalActorForOwnerInUBT,
      workflowStepConstants.verifySetInternalActorForFacilitatorInUBT,
      workflowStepConstants.saveTokenRules,
      workflowStepConstants.saveTokenHolderMasterCopy,
      workflowStepConstants.saveUserWalletFactory,
      workflowStepConstants.saveGnosisSafeMultiSigMasterCopy,
      workflowStepConstants.saveDelayedRecoveryModuleMasterCopy,
      workflowStepConstants.fundRecoveryControllerAddress
    ],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.savePricerRule]
  },
  [workflowStepConstants.savePricerRule]: {
    kind: workflowStepConstants.savePricerRule,
    readDataFrom: [workflowStepConstants.deployPricerRule],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [
      workflowStepConstants.registerPricerRule,
      workflowStepConstants.addUsdPriceOracleInPricerRule,
      workflowStepConstants.addEurPriceOracleInPricerRule,
      workflowStepConstants.addGbpPriceOracleInPricerRule,
      workflowStepConstants.setUsdAcceptedMarginInPricerRule,
      workflowStepConstants.setEurAcceptedMarginInPricerRule,
      workflowStepConstants.setGbpAcceptedMarginInPricerRule,
      workflowStepConstants.deployProxyFactory,
      workflowStepConstants.setInternalActorForTRInUBT
    ]
  },
  [workflowStepConstants.registerPricerRule]: {
    kind: workflowStepConstants.registerPricerRule,
    prerequisites: [workflowStepConstants.savePricerRule],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.verifyRegisterPricerRule]
  },
  [workflowStepConstants.verifyRegisterPricerRule]: {
    kind: workflowStepConstants.verifyRegisterPricerRule,
    readDataFrom: [workflowStepConstants.registerPricerRule],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.assignShards]
  },
  [workflowStepConstants.addUsdPriceOracleInPricerRule]: {
    kind: workflowStepConstants.addUsdPriceOracleInPricerRule,
    prerequisites: [workflowStepConstants.savePricerRule],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.verifyAddUsdPriceOracleInPricerRule]
  },
  [workflowStepConstants.verifyAddUsdPriceOracleInPricerRule]: {
    kind: workflowStepConstants.verifyAddUsdPriceOracleInPricerRule,
    readDataFrom: [workflowStepConstants.addUsdPriceOracleInPricerRule],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.assignShards]
  },
  [workflowStepConstants.addEurPriceOracleInPricerRule]: {
    kind: workflowStepConstants.addEurPriceOracleInPricerRule,
    prerequisites: [workflowStepConstants.savePricerRule],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.verifyAddEurPriceOracleInPricerRule]
  },
  [workflowStepConstants.verifyAddEurPriceOracleInPricerRule]: {
    kind: workflowStepConstants.verifyAddEurPriceOracleInPricerRule,
    readDataFrom: [workflowStepConstants.addEurPriceOracleInPricerRule],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.assignShards]
  },
  [workflowStepConstants.addGbpPriceOracleInPricerRule]: {
    kind: workflowStepConstants.addGbpPriceOracleInPricerRule,
    prerequisites: [workflowStepConstants.savePricerRule],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.verifyAddGbpPriceOracleInPricerRule]
  },
  [workflowStepConstants.verifyAddGbpPriceOracleInPricerRule]: {
    kind: workflowStepConstants.verifyAddGbpPriceOracleInPricerRule,
    readDataFrom: [workflowStepConstants.addGbpPriceOracleInPricerRule],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.assignShards]
  },
  [workflowStepConstants.setUsdAcceptedMarginInPricerRule]: {
    kind: workflowStepConstants.setUsdAcceptedMarginInPricerRule,
    prerequisites: [workflowStepConstants.savePricerRule],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.verifySetUsdAcceptedMarginInPricerRule]
  },
  [workflowStepConstants.verifySetUsdAcceptedMarginInPricerRule]: {
    kind: workflowStepConstants.verifySetUsdAcceptedMarginInPricerRule,
    readDataFrom: [workflowStepConstants.setUsdAcceptedMarginInPricerRule],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.assignShards]
  },
  [workflowStepConstants.setEurAcceptedMarginInPricerRule]: {
    kind: workflowStepConstants.setEurAcceptedMarginInPricerRule,
    prerequisites: [workflowStepConstants.savePricerRule],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.verifySetEurAcceptedMarginInPricerRule]
  },
  [workflowStepConstants.verifySetEurAcceptedMarginInPricerRule]: {
    kind: workflowStepConstants.verifySetEurAcceptedMarginInPricerRule,
    readDataFrom: [workflowStepConstants.setEurAcceptedMarginInPricerRule],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.assignShards]
  },
  [workflowStepConstants.setGbpAcceptedMarginInPricerRule]: {
    kind: workflowStepConstants.setGbpAcceptedMarginInPricerRule,
    prerequisites: [workflowStepConstants.savePricerRule],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.verifySetGbpAcceptedMarginInPricerRule]
  },
  [workflowStepConstants.verifySetGbpAcceptedMarginInPricerRule]: {
    kind: workflowStepConstants.verifySetGbpAcceptedMarginInPricerRule,
    readDataFrom: [workflowStepConstants.setGbpAcceptedMarginInPricerRule],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.assignShards]
  },
  [workflowStepConstants.deployProxyFactory]: {
    kind: workflowStepConstants.deployProxyFactory,
    prerequisites: [workflowStepConstants.savePricerRule],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.saveProxyFactory]
  },
  [workflowStepConstants.saveProxyFactory]: {
    kind: workflowStepConstants.saveProxyFactory,
    readDataFrom: [workflowStepConstants.deployProxyFactory],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.assignShards]
  },
  [workflowStepConstants.setInternalActorForTRInUBT]: {
    kind: workflowStepConstants.setInternalActorForTRInUBT,
    prerequisites: [workflowStepConstants.savePricerRule],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.verifySetInternalActorForTRInUBT]
  },
  [workflowStepConstants.verifySetInternalActorForTRInUBT]: {
    kind: workflowStepConstants.verifySetInternalActorForTRInUBT,
    readDataFrom: [workflowStepConstants.setInternalActorForTRInUBT],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.assignShards]
  },
  [workflowStepConstants.assignShards]: {
    kind: workflowStepConstants.assignShards,
    prerequisites: [
      workflowStepConstants.verifyRegisterPricerRule,
      workflowStepConstants.verifyAddUsdPriceOracleInPricerRule,
      workflowStepConstants.verifyAddEurPriceOracleInPricerRule,
      workflowStepConstants.verifyAddGbpPriceOracleInPricerRule,
      workflowStepConstants.verifySetUsdAcceptedMarginInPricerRule,
      workflowStepConstants.verifySetEurAcceptedMarginInPricerRule,
      workflowStepConstants.verifySetGbpAcceptedMarginInPricerRule,
      workflowStepConstants.saveProxyFactory,
      workflowStepConstants.verifySetInternalActorForTRInUBT
    ],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.initializeCompanyTokenHolderInDb]
  },
  [workflowStepConstants.initializeCompanyTokenHolderInDb]: {
    kind: workflowStepConstants.initializeCompanyTokenHolderInDb,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.createCompanyWallet]
  },
  [workflowStepConstants.createCompanyWallet]: {
    kind: workflowStepConstants.createCompanyWallet,
    readDataFrom: [workflowStepConstants.initializeCompanyTokenHolderInDb],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.verifyCreateCompanyWallet]
  },
  [workflowStepConstants.verifyCreateCompanyWallet]: {
    kind: workflowStepConstants.verifyCreateCompanyWallet,
    readDataFrom: [workflowStepConstants.initializeCompanyTokenHolderInDb],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.setInternalActorForCompanyTHInUBT]
  },
  [workflowStepConstants.setInternalActorForCompanyTHInUBT]: {
    kind: workflowStepConstants.setInternalActorForCompanyTHInUBT,
    readDataFrom: [workflowStepConstants.verifyCreateCompanyWallet],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.verifySetInternalActorForCompanyTHInUBT]
  },
  [workflowStepConstants.verifySetInternalActorForCompanyTHInUBT]: {
    kind: workflowStepConstants.verifySetInternalActorForCompanyTHInUBT,
    readDataFrom: [workflowStepConstants.setInternalActorForCompanyTHInUBT],
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.activateTokenGateway]
  },
  [workflowStepConstants.activateTokenGateway]: {
    kind: workflowStepConstants.activateTokenGateway,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.verifyActivateTokenGateway]
  },
  [workflowStepConstants.verifyActivateTokenGateway]: {
    kind: workflowStepConstants.verifyActivateTokenGateway,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    readDataFrom: [workflowStepConstants.activateTokenGateway],
    onSuccess: [workflowStepConstants.verifyEconomySetup]
  },
  [workflowStepConstants.verifyEconomySetup]: {
    kind: workflowStepConstants.verifyEconomySetup,
    onFailure: workflowStepConstants.sendTokenSetupErrorEmail,
    onSuccess: [workflowStepConstants.sendTokenSetupSuccessEmail]
  },
  [workflowStepConstants.sendTokenSetupSuccessEmail]: {
    kind: workflowStepConstants.sendTokenSetupSuccessEmail,
    onFailure: workflowStepConstants.markSuccess, // Showing leniency.
    onSuccess: [workflowStepConstants.markSuccess]
  },
  [workflowStepConstants.sendTokenSetupErrorEmail]: {
    kind: workflowStepConstants.sendTokenSetupErrorEmail,
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

module.exports = economySetupStepsConfig;
