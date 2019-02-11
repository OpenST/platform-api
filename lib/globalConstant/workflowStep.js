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
    return null;
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
  get verifyEconomySetup() {
    return 'verifyEconomySetup';
  }
  get assignShards() {
    return 'assignShards';
  }
  get fundExTxWorkers() {
    return 'fundExTxWorkers';
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

  // User setUp steps start
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

  get activateUser() {
    return 'activateUser';
  }

  get rollbackUserSetup() {
    return 'rollbackUserSetup';
  }

  // User set up steps finish

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
