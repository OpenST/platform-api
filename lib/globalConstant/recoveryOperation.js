'use strict';
/**
 * Recovery operation constants
 *
 * @module lib/globalConstant/recoveryOperation
 */
const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

let kinds, invertedKinds, statuses, invertedStatuses;

/**
 * Class for Recovery operation constants
 *
 * @class
 */
class RecoveryOperationConstants {
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

  /**
   * Get kinds.
   *
   * @return {{'1': string, '2': string, '3': string, '4': string, '5': string}|*}
   */
  get kinds() {
    const oThis = this;

    if (kinds) {
      return kinds;
    }

    kinds = {
      '1': oThis.initiateRecoveryByUserKind,
      '2': oThis.abortRecoveryByUserKind,
      '3': oThis.pinResetByUserKind,
      '4': oThis.executeRecoveryByControllerKind,
      '5': oThis.abortRecoveryByControllerKind
    };

    return kinds;
  }

  /**
   * Inverted kinds.
   *
   * @returns {*}
   */
  get invertedKinds() {
    const oThis = this;

    if (invertedKinds) {
      return invertedKinds;
    }

    return util.invert(oThis.kinds);
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

  get abortedStatus() {
    return 'aborted';
  }

  get adminActionFailedStatus() {
    return 'adminActionFailed';
  }

  get failedStatus() {
    return 'failed';
  }

  get requestsCountThreshold() {
    return 3;
  }

  get timeDurationInSeconds() {
    return 3600; // 1 hour.
  }

  get requestsUsersCount() {
    return 5000;
  }

  /**
   * Get statuses.
   *
   * @return {{'1': string, '2': string, '3': string, '4': string, '5': string, '6': string}|*}
   */
  get statuses() {
    const oThis = this;

    if (statuses) {
      return statuses;
    }

    statuses = {
      '1': oThis.inProgressStatus,
      '2': oThis.waitingForAdminActionStatus,
      '3': oThis.completedStatus,
      '4': oThis.abortedStatus,
      '5': oThis.adminActionFailedStatus,
      '6': oThis.failedStatus
    };

    return statuses;
  }

  /**
   * Inverted statuses.
   *
   * @returns {*}
   */
  get invertedStatuses() {
    const oThis = this;

    if (invertedStatuses) {
      return invertedStatuses;
    }

    return util.invert(oThis.statuses);
  }

  // Status constants ends.
}

module.exports = new RecoveryOperationConstants();
