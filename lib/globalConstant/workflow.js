/**
 * Module for workflow constants.
 *
 * @module lib/globalConstant/workflow
 */

/**
 * Class for workflow constants.
 *
 * @class WorkflowConstants
 */
class WorkflowConstants {
  // Kind of workflow starts.
  get stPrimeStakeAndMintKind() {
    return 'stPrimeStakeAndMintKind';
  }

  get tokenDeployKind() {
    return 'tokenDeploy';
  }

  get stateRootSyncKind() {
    return 'stateRootSync';
  }

  get testKind() {
    return 'testKind';
  }

  get btStakeAndMintKind() {
    return 'btStakeAndMintKind';
  }

  get grantEthStakeCurrencyKind() {
    return 'grantEthStakeCurrencyKind';
  }

  get setupUserKind() {
    return 'setupUserKind';
  }

  get authorizeDeviceKind() {
    return 'authorizeDeviceKind';
  }

  get authorizeSessionKind() {
    return 'authorizeSessionKind';
  }

  get revokeDeviceKind() {
    return 'revokeDeviceKind';
  }

  get revokeSessionKind() {
    return 'revokeSessionKind';
  }

  get initiateRecoveryKind() {
    return 'initiateRecoveryKind';
  }

  get abortRecoveryByOwnerKind() {
    return 'abortRecoveryByOwnerKind';
  }

  get resetRecoveryOwnerKind() {
    return 'resetRecoveryOwnerKind';
  }

  get executeRecoveryKind() {
    return 'executeRecoveryKind';
  }

  get abortRecoveryByRecoveryControllerKind() {
    return 'abortRecoveryByRecoveryControllerKind';
  }

  get logoutSessionsKind() {
    return 'logoutSessionsKind';
  }

  get stPrimeRedeemAndUnstakeKind() {
    return 'stPrimeRedeemAndUnstakeKind';
  }

  get btRedeemAndUnstakeKind() {
    return 'btRedeemAndUnstakeKind';
  }

  get updatePricePointKind() {
    return 'updatePricePointKind';
  }
  // Kind of workflow ends.

  // Status constants starts.
  get inProgressStatus() {
    return 'inProgress';
  }

  get completedStatus() {
    return 'completed';
  }

  get failedStatus() {
    return 'failed';
  }

  get completelyFailedStatus() {
    return 'completelyFailed';
  }
  // Status constants ends.
}

module.exports = new WorkflowConstants();
