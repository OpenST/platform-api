'use strict';
/**
 * Workflow constants
 *
 * @module lib/globalConstant/workflow
 */

/**
 * Class for Workflow constants
 *
 * @class
 */
class WorkflowConstants {
  /**
   * Constructor for Workflow constants
   *
   * @constructor
   */
  constructor() {}

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

  get grantEthOstKind() {
    return 'grantEthOstKind';
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
