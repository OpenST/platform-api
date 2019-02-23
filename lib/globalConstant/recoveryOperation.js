'use strict';
/**
 * Recovery operation constants
 *
 * @module lib/globalConstant/recoveryOperation
 */

/**
 * Class for Recovery operation constants
 *
 * @class
 */
class RecoveryOperationConstants {
  /**
   * Constructor for RecoveryOperationConstants
   *
   * @constructor
   */
  constructor() {}

  // Kind of recovery operation starts.
  get initiateRecoveryByUserKind() {
    return 'initiateRecoveryByUser';
  }

  get abortRecoveryByUserKind() {
    return 'abortRecoveryByUser';
  }

  get pinResetByUserKind() {
    return 'pinResetByUser';
  }

  get executeRecoveryByControllerKind() {
    return 'executeRecoveryByController';
  }

  get abortRecoveryByControllerKind() {
    return 'abortRecoveryByController';
  }

  // Kind of recovery operation ends.

  // Status constants starts.
  get inProgressStatus() {
    return 'inProgress';
  }

  get waitingForAdminActionStatus() {
    return 'waiting';
  }

  get completedStatus() {
    return 'completed';
  }

  get failedStatus() {
    return 'failed';
  }
  // Status constants ends.
}

module.exports = new RecoveryOperationConstants();
