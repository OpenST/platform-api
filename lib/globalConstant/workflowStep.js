'use strict';
/**
 * Workflow step constants
 *
 * @module lib/globalConstant/workflowStep
 */

/**
 * Class for Workflow step constants
 *
 * @class
 */
class WorkflowStepConstants {
  /**
   * Constructor for Workflow step constants
   *
   * @constructor
   */
  constructor() {}

  // The process/task status.
  get taskReadyToStart() {
    return 'taskReadyToStart';
  }

  get taskDone() {
    return 'taskDone';
  }

  get taskPending() {
    return 'taskPending';
  }

  get taskFailed() {
    return 'taskFailed';
  }
  // The process/task status end.

  //Generic constants start

  get queuedStatus() {
    return 'queued';
  }

  get pendingStatus() {
    return 'pending';
  }

  get processedStatus() {
    return 'processed';
  }

  get failedStatus() {
    return 'failed';
  }

  get timeoutStatus() {
    return 'timeOut';
  }

  get retriedStatus() {
    return 'retried';
  }

  //Generic constants end

  // Onboarding/economySetup Steps Start

  get economySetupInit() {
    return 'economySetupInit';
  }
  get generateTokenAddresses() {
    return 'generateTokenAddresses';
  }
  get generateTxWorkerAddresses() {
    return 'generateTxWorkerAddresses';
  }
  get fundAuxFunderAddress() {
    return 'fundAuxFunderAddress';
  }
  get verifyFundAuxFunderAddress() {
    return 'verifyFundAuxFunderAddress';
  }
  get fundAuxAdminAddress() {
    return 'fundAuxAdminAddress';
  }
  get verifyFundAuxAdminAddress() {
    return 'verifyFundAuxAdminAddress';
  }
  get fundAuxWorkerAddress() {
    return 'fundAuxWorkerAddress';
  }
  get verifyFundAuxWorkerAddress() {
    return 'verifyFundAuxWorkerAddress';
  }
  get deployOriginTokenOrganization() {
    return 'deployOriginTokenOrganization';
  }
  get saveOriginTokenOrganization() {
    return 'saveOriginTokenOrganization';
  }
  get deployAuxTokenOrganization() {
    return 'deployAuxTokenOrganization';
  }
  get saveAuxTokenOrganization() {
    return 'saveAuxTokenOrganization';
  }
  get deployOriginBrandedToken() {
    return 'deployOriginBrandedToken';
  }
  get saveOriginBrandedToken() {
    return 'saveOriginBrandedToken';
  }
  get deployUtilityBrandedToken() {
    return 'deployUtilityBrandedToken';
  }
  get saveUtilityBrandedToken() {
    return 'saveUtilityBrandedToken';
  }
  get deployTokenGateway() {
    return 'deployTokenGateway';
  }
  get saveTokenGateway() {
    return 'saveTokenGateway';
  }
  get deployTokenCoGateway() {
    return 'deployTokenCoGateway';
  }
  get saveTokenCoGateway() {
    return 'saveTokenCoGateway';
  }
  get updateTokenInOstView() {
    return 'updateTokenInOstView';
  }
  get activateTokenGateway() {
    return 'activateTokenGateway';
  }
  get verifyActivateTokenGateway() {
    return 'verifyActivateTokenGateway';
  }
  get setCoGatewayInUbt() {
    return 'setCoGatewayInUbt';
  }
  get verifySetCoGatewayInUbt() {
    return 'verifySetCoGatewayInUbt';
  }
  get setGatewayInBt() {
    return 'setGatewayInBt';
  }
  get verifySetGatewayInBt() {
    return 'verifySetGatewayInBt';
  }
  get deployGatewayComposer() {
    return 'deployGatewayComposer';
  }
  get verifyDeployGatewayComposer() {
    return 'verifyDeployGatewayComposer';
  }
  get setInternalActorForOwnerInUBT() {
    return 'setInternalActorForOwnerInUBT';
  }
  get verifySetInternalActorForOwnerInUBT() {
    return 'verifySetInternalActorForOwnerInUBT';
  }
  get deployTokenRules() {
    return 'deployTokenRules';
  }
  get saveTokenRules() {
    return 'saveTokenRules';
  }
  get postTokenRuleDeploy() {
    return 'postTokenRuleDeploy';
  }
  get deployTokenHolderMasterCopy() {
    return 'deployTokenHolderMasterCopy';
  }
  get saveTokenHolderMasterCopy() {
    return 'saveTokenHolderMasterCopy';
  }
  get deployUserWalletFactory() {
    return 'deployUserWalletFactory';
  }
  get saveUserWalletFactory() {
    return 'saveUserWalletFactory';
  }
  get deployGnosisSafeMultiSigMasterCopy() {
    return 'deployGnosisSafeMultiSigMasterCopy';
  }
  get saveGnosisSafeMultiSigMasterCopy() {
    return 'saveGnosisSafeMultiSigMasterCopy';
  }
  get deployDelayedRecoveryModuleMasterCopy() {
    return 'deployDelayedRecoveryModuleMasterCopy';
  }
  get saveDelayedRecoveryModuleMasterCopy() {
    return 'saveDelayedRecoveryModuleMasterCopy';
  }
  get deployCreateAndAddModules() {
    return 'deployCreateAndAddModules';
  }
  get saveCreateAndAddModules() {
    return 'saveCreateAndAddModules';
  }
  get deployPricerRule() {
    return 'deployPricerRule';
  }
  get savePricerRule() {
    return 'savePricerRule';
  }
  get registerPricerRule() {
    return 'registerPricerRule';
  }
  get verifyRegisterPricerRule() {
    return 'verifyRegisterPricerRule';
  }
  get addPriceOracleInPricerRule() {
    return 'addPriceOracleInPricerRule';
  }
  get verifyAddPriceOracleInPricerRule() {
    return 'verifyAddPriceOracleInPricerRule';
  }
  get setAcceptedMarginInPricerRule() {
    return 'setAcceptedMarginInPricerRule';
  }
  get verifySetAcceptedMarginInPricerRule() {
    return 'verifySetAcceptedMarginInPricerRule';
  }
  get deployProxyFactory() {
    return 'deployProxyFactory';
  }
  get saveProxyFactory() {
    return 'saveProxyFactory';
  }
  get initializeCompanyTokenHolderInDb() {
    return 'initializeCompanyTokenHolderInDb';
  }
  get createCompanyWallet() {
    return 'createCompanyWallet';
  }
  get verifyCreateCompanyWallet() {
    return 'verifyCreateCompanyWallet';
  }
  get setInternalActorForCompanyTHInUBT() {
    return 'setInternalActorForCompanyTHInUBT';
  }
  get verifySetInternalActorForCompanyTHInUBT() {
    return 'verifySetInternalActorForCompanyTHInUBT';
  }
  get setInternalActorForTRInUBT() {
    return 'setInternalActorForTRInUBT';
  }
  get verifySetInternalActorForTRInUBT() {
    return 'verifySetInternalActorForTRInUBT';
  }
  get setInternalActorForFacilitatorInUBT() {
    return 'setInternalActorForFacilitatorInUBT';
  }
  get verifySetInternalActorForFacilitatorInUBT() {
    return 'verifySetInternalActorForFacilitatorInUBT';
  }
  get verifyEconomySetup() {
    return 'verifyEconomySetup';
  }
  get assignShards() {
    return 'assignShards';
  }
  get fundExTxWorkers() {
    return 'fundExTxWorkers';
  }
  get fundTokenUserOpsWorker() {
    return 'fundTokenUserOpsWorker';
  }
  get verifyFundTokenUserOpsWorker() {
    return 'verifyFundTokenUserOpsWorker';
  }
  get fundRecoveryControllerAddress() {
    return 'fundRecoveryControllerAddress';
  }
  get sendTokenSetupSuccessEmail() {
    return 'sendTokenSetupSuccessEmail';
  }
  get sendTokenSetupErrorEmail() {
    return 'sendTokenSetupErrorEmail';
  }

  // Onboarding/economySetup Steps end

  // stake & mint Steps Start

  // stake & mint Steps end

  // State root sync steps start
  get commitStateRootInit() {
    return 'commitStateRootInit';
  }
  get commitStateRoot() {
    return 'commitStateRoot';
  }
  get updateCommittedStateRootInfo() {
    return 'updateCommittedStateRootInfo';
  }
  // State root sync steps end

  // Common Steps Start

  get markSuccess() {
    return 'markSuccess';
  }

  get markFailure() {
    return 'markFailure';
  }
  // Common Steps End

  // ST prime stake and mint steps
  get stPrimeStakeAndMintInit() {
    return 'stPrimeStakeAndMintInit';
  }
  get stPrimeApprove() {
    return 'stPrimeApprove';
  }

  get simpleTokenStake() {
    return 'simpleTokenStake';
  }

  get fetchStakeIntentMessageHash() {
    return 'fetchStakeIntentMessageHash';
  }

  get proveGatewayOnCoGateway() {
    return 'proveGatewayOnCoGateway';
  }

  get confirmStakeIntent() {
    return 'confirmStakeIntent';
  }

  get progressStake() {
    return 'progressStake';
  }

  get progressMint() {
    return 'progressMint';
  }

  get checkApproveStatus() {
    return 'checkApproveStatus';
  }
  get checkStakeStatus() {
    return 'checkStakeStatus';
  }
  get checkProveGatewayStatus() {
    return 'checkProveGatewayStatus';
  }
  get checkConfirmStakeStatus() {
    return 'checkConfirmStakeStatus';
  }
  get checkProgressStakeStatus() {
    return 'checkProgressStakeStatus';
  }

  get checkProgressMintStatus() {
    return 'checkProgressMintStatus';
  }

  // Branded token stake and mint
  get btStakeAndMintInit() {
    return 'btStakeAndMintInit';
  }

  get recordRequestStakeTx() {
    return 'recordRequestStakeTx';
  }

  get fetchStakeRequestHash() {
    return 'fetchStakeRequestHash';
  }

  get approveGatewayComposerTrx() {
    return 'approveGatewayComposerTrx';
  }

  get checkGatewayComposerAllowance() {
    return 'checkGatewayComposerAllowance';
  }

  get acceptStake() {
    return 'acceptStake';
  }

  get sendStakeAndMintSuccessEmail() {
    return 'sendStakeAndMintSuccessEmail';
  }
  get sendStakeAndMintErrorEmail() {
    return 'sendStakeAndMintErrorEmail';
  }

  //Grant eth and ost Steps start

  get grantEthOstInit() {
    return 'grantEthOstInit';
  }

  get grantEth() {
    return 'grantEth';
  }

  get verifyGrantEth() {
    return 'verifyGrantEth';
  }

  get grantOst() {
    return 'grantOst';
  }

  get verifyGrantOst() {
    return 'verifyGrantOst';
  }
  //Grant eth and ost Steps finish.

  // User set-up steps start
  // TOKEN HOLDER Deployment

  get userSetupInit() {
    return 'userSetupInit';
  }

  get addSessionAddresses() {
    return 'addSessionAddresses';
  }

  get addUserInWalletFactory() {
    return 'addUserInWalletFactory';
  }

  get fetchRegisteredUserEvent() {
    return 'fetchRegisteredUserEvent';
  }

  get setInternalActorForTokenHolderInUBT() {
    return 'setInternalActorForTokenHolderInUBT';
  }

  get verifyInternalActorTransactionInUBT() {
    return 'verifyInternalActorTransactionInUBT';
  }

  get activateUser() {
    return 'activateUser';
  }

  get rollbackUserSetup() {
    return 'rollbackUserSetup';
  }

  // User set-up steps finish

  //Authorize Device Multisig Operation start
  get authorizeDeviceInit() {
    return 'authorizeDeviceInit';
  }

  get authorizeDevicePerformTransaction() {
    return 'authorizeDevicePerformTransaction';
  }

  get authorizeDeviceVerifyTransaction() {
    return 'authorizeDeviceVerifyTransaction';
  }

  get rollbackAuthorizeDeviceTransaction() {
    return 'rollbackAuthorizeDeviceTransaction';
  }
  //Authorize Device Multisig Operation finish

  //Revoke Device Multisig Operation start
  get revokeDeviceInit() {
    return 'revokeDeviceInit';
  }

  get revokeDevicePerformTransaction() {
    return 'revokeDevicePerformTransaction';
  }

  get revokeDeviceVerifyTransaction() {
    return 'revokeDeviceVerifyTransaction';
  }

  get rollbackRevokeDeviceTransaction() {
    return 'rollbackRevokeDeviceTransaction';
  }
  //Revoke Device Multisig Operation finish

  //Authorize Session Multisig Operation start
  get authorizeSessionInit() {
    return 'authorizeSessionInit';
  }

  get authorizeSessionPerformTransaction() {
    return 'authorizeSessionPerformTransaction';
  }

  get authorizeSessionVerifyTransaction() {
    return 'authorizeSessionVerifyTransaction';
  }

  get rollbackAuthorizeSessionTransaction() {
    return 'rollbackAuthorizeSessionTransaction';
  }
  //Authorize Device Multisig Operation finish

  //Revoke Session Multisig Operation start
  get revokeSessionInit() {
    return 'revokeSessionInit';
  }

  get revokeSessionPerformTransaction() {
    return 'revokeSessionPerformTransaction';
  }

  get revokeSessionVerifyTransaction() {
    return 'revokeSessionVerifyTransaction';
  }

  get rollbackRevokeSessionTransaction() {
    return 'rollbackRevokeSessionTransaction';
  }
  //Revoke Session Multisig Operation finish

  // Logout Session Operation Start
  get logoutSessionInit() {
    return 'logoutSessionInit';
  }

  get logoutSessionPerformTransaction() {
    return 'logoutSessionPerformTransaction';
  }

  get logoutSessionVerifyTransaction() {
    return 'logoutSessionVerifyTransaction';
  }

  // Logout Session Operation finish

  // Initiate recovery operation starts.
  get initiateRecoveryInit() {
    return 'initiateRecoveryInit';
  }

  get initiateRecoveryPerformTransaction() {
    return 'initiateRecoveryPerformTransaction';
  }

  get initiateRecoveryVerifyTransaction() {
    return 'initiateRecoveryVerifyTransaction';
  }
  // Initiate recovery operation finish.

  // Abort recovery by owner operation starts.
  get abortRecoveryByOwnerInit() {
    return 'abortRecoveryByOwnerInit';
  }

  get abortRecoveryByOwnerPerformTransaction() {
    return 'abortRecoveryByOwnerPerformTransaction';
  }

  get abortRecoveryByOwnerVerifyTransaction() {
    return 'abortRecoveryByOwnerVerifyTransaction';
  }
  // Abort recovery by owner operation finish.

  // Reset recovery owner operation starts.
  get resetRecoveryOwnerInit() {
    return 'resetRecoveryOwnerInit';
  }

  get resetRecoveryOwnerPerformTransaction() {
    return 'resetRecoveryOwnerPerformTransaction';
  }

  get resetRecoveryOwnerVerifyTransaction() {
    return 'resetRecoveryOwnerVerifyTransaction';
  }
  // Reset recovery owner operation finish.

  // Execute recovery owner operation starts.
  get executeRecoveryInit() {
    return 'executeRecoveryInit';
  }

  get executeRecoveryPerformTransaction() {
    return 'executeRecoveryPerformTransaction';
  }

  get executeRecoveryVerifyTransaction() {
    return 'executeRecoveryVerifyTransaction';
  }
  // Execute recovery owner operation finish.

  // Abort recovery by recovery controller operation starts.
  get abortRecoveryByRecoveryControllerInit() {
    return 'abortRecoveryByRecoveryControllerInit';
  }

  get abortRecoveryByRecoveryControllerPerformTransaction() {
    return 'abortRecoveryByRecoveryControllerPerformTransaction';
  }

  get abortRecoveryByRecoveryControllerVerifyTransaction() {
    return 'abortRecoveryByRecoveryControllerVerifyTransaction';
  }
  // Abort recovery by recovery controller finish.

  // ST prime Redeem and Unstake steps
  get stPrimeRedeemAndUnstakeInit() {
    return 'stPrimeRedeemAndUnstakeInit';
  }
  get stPrimeWrapAsBT() {
    return 'stPrimeWrapAsBT';
  }

  get stPrimeApproveCoGateway() {
    return 'stPrimeApproveCoGateway';
  }

  get stPrimeRedeem() {
    return 'stPrimeRedeem';
  }

  get fetchRedeemIntentMessageHash() {
    return 'fetchRedeemIntentMessageHash';
  }

  get proveCoGatewayOnGateway() {
    return 'proveCoGatewayOnGateway';
  }

  get confirmRedeemIntent() {
    return 'confirmRedeemIntent';
  }

  get progressRedeem() {
    return 'progressRedeem';
  }

  get progressUnstake() {
    return 'progressUnstake';
  }

  get checkWrapStPrimeStatus() {
    return 'checkWrapStPrimeStatus';
  }

  get checkApproveCoGatewayStatus() {
    return 'checkApproveCoGatewayStatus';
  }
  get checkRedeemStatus() {
    return 'checkRedeemStatus';
  }
  get checkProveCoGatewayStatus() {
    return 'checkProveCoGatewayStatus';
  }
  get checkConfirmRedeemStatus() {
    return 'checkConfirmRedeemStatus';
  }
  get checkProgressRedeemStatus() {
    return 'checkProgressRedeemStatus';
  }

  get checkProgressUnstakeStatus() {
    return 'checkProgressUnstakeStatus';
  }

  get btRedeemAndUnstakeInit() {
    return 'btRedeemAndUnstakeInit';
  }

  get executeBTRedemption() {
    return 'executeBTRedemption';
  }

  get checkExecuteBTRedemptionStatus() {
    return 'checkExecuteBTRedemptionStatus';
  }

  // Update Price Points steps start
  get updatePricePointInit() {
    return 'updatePricePointInit';
  }

  get fetchPricePointFromCoinMarketCapApi() {
    return 'fetchPricePointFromCoinMarketCapApi';
  }

  get setPriceInPriceOracleContract() {
    return 'setPriceInPriceOracleContract';
  }

  get verifySetPriceInPriceOracleContract() {
    return 'verifySetPriceInPriceOracleContract';
  }

  // Update Price Points steps end

  // Test Steps Start
  get testInit() {
    return 'testInit';
  }
  get s1() {
    return 's1';
  }
  get s2() {
    return 's2';
  }
  get s33() {
    return 's33';
  }
  get s4() {
    return 's4';
  }
  get s5() {
    return 's5';
  }
  get s6() {
    return 's6';
  }
  get s7() {
    return 's7';
  }
  // Test Steps End
}

module.exports = new WorkflowStepConstants();
