'use strict';
/**
 * Transaction finalizer task constants
 *
 * @module lib/globalConstant/transactionFinalizerTask
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

let statuses, invertedStatuses, kinds, invertedKinds;

/**
 * Class for Transaction finalizer task constants
 *
 * @class
 */
class TransactionMetaConstants {
  /**
   *
   * @constructor
   */
  constructor() {}

  get statuses() {
    const oThis = this;
    if (statuses) return statuses;
    statuses = {
      '1': oThis.queuedStatus,
      '2': oThis.queuedFailedStatus,
      '3': oThis.submittedToGethStatus,
      '4': oThis.mined,
      '5': oThis.finalizationInProcess,
      '6': oThis.finalized,
      '7': oThis.finalizationFailed,
      '8': oThis.failedToBeRenqueuedStatus,
      '9': oThis.gethDownStatus,
      '10': oThis.finalFailedStatus
    };
    return statuses;
  }

  get invertedStatuses() {
    const oThis = this;
    if (invertedStatuses) return invertedStatuses;
    invertedStatuses = util.invert(oThis.statuses);
    return invertedStatuses;
  }

  get kinds() {
    const oThis = this;
    if (kinds) return kinds;

    kinds = {
      '1': oThis.ruleExecution
    };
    return kinds;
  }

  get invertedKinds() {
    const oThis = this;
    if (invertedKinds) return invertedKinds;
    invertedKinds = util.invert(oThis.kinds);
    return invertedKinds;
  }

  get retryLimits() {
    const oThis = this;

    return {
      [oThis.mined]: 10
    };
  }

  get nextActionAtDelta() {
    const oThis = this;
    return {
      [oThis.queuedStatus]: 1800 //30 minutes
    };
  }

  getNextActionAtFor(status) {
    const oThis = this;
    let waitTimeForProcessingSec = oThis.nextActionAtDelta[status],
      currentTimeStampInSeconds = new Date().getTime() / 1000;

    return currentTimeStampInSeconds + waitTimeForProcessingSec;
  }

  // Status constants starts.
  get queuedStatus() {
    return 'queuedStatus';
  }

  get queuedFailedStatus() {
    return 'queuedFailedStatus';
  }

  get rollbackNeededStatus() {
    return 'rollbackNeededStatus';
  }

  get gethDownStatus() {
    return 'gethDownStatus';
  }

  get submittedToGethStatus() {
    return 'submittedToGeth';
  }

  get mined() {
    return 'mined';
  }

  get finalizationInProcess() {
    return 'finalizationInProcess';
  }

  get finalizationFailed() {
    return 'finalizationFailed';
  }

  get failedToBeRenqueuedStatus() {
    return 'failedToBeRenqueued';
  }

  get gethDownStatus() {
    return 'gethDown';
  }

  get finalFailedStatus() {
    return 'finalFailed';
  }

  get rollBackBalanceStatus() {
    return 'rollBackBalance';
  }

  get finalized() {
    return 'finalized';
  }
  // Status constants ends.

  // Kind constants starts.
  get ruleExecution() {
    return 'ruleExecution';
  }
  // Kind constants ends.
}

module.exports = new TransactionMetaConstants();