'use strict';
/**
 * Transaction finalizer task constants
 *
 * @module lib/globalConstant/transactionFinalizerTask
 */

const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
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
      '4': oThis.minedStatus,
      '5': oThis.finalizationInProcess,
      '6': oThis.finalizedStatus,
      '7': oThis.finalizationFailed,
      '9': oThis.unknownGethSubmissionErrorStatus,
      '10': oThis.finalFailedStatus,
      '11': oThis.gethDownStatus,
      '12': oThis.rollBackBalanceStatus,
      '13': oThis.insufficientGasStatus,
      '14': oThis.nonceTooLowStatus,
      '15': oThis.replacementTxUnderpricedStatus,
      '16': oThis.gethOutOfSyncStatus
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
      [oThis.minedStatus]: 10
    };
  }

  get nextActionAtDelta() {
    const oThis = this;
    return {
      [oThis.queuedStatus]: 1800, //30 minutes
      [oThis.submittedToGethStatus]: 120, //2 minutes
      [oThis.finalizationFailed]: 120, //2 minutes
      [oThis.rollBackBalanceStatus]: 60, //1 minute
      [oThis.gethDownStatus]: 300, //5 minutes
      [oThis.insufficientGasStatus]: 300, //5 minutes
      [oThis.nonceTooLowStatus]: 300, //5 minutes
      [oThis.replacementTxUnderpricedStatus]: 300, //5 minutes
      [oThis.gethOutOfSync]: 300 //5 minutes
    };
  }

  getNextActionAtFor(statusString) {
    const oThis = this;
    let waitTimeForProcessingSec = oThis.nextActionAtDelta[statusString],
      currentTimeStampInSeconds = basicHelper.timestampInSeconds();

    return currentTimeStampInSeconds + waitTimeForProcessingSec;
  }

  // Status constants starts.
  get queuedStatus() {
    return 'queuedStatus';
  }

  get queuedFailedStatus() {
    return 'queuedFailedStatus';
  }

  get submittedToGethStatus() {
    return 'submittedToGeth';
  }

  get minedStatus() {
    return 'mined';
  }

  get finalizationInProcess() {
    return 'finalizationInProcess';
  }

  get finalizationFailed() {
    return 'finalizationFailed';
  }

  get finalizedStatus() {
    return 'finalized';
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

  get insufficientGasStatus() {
    return 'insufficientGas';
  }

  get nonceTooLowStatus() {
    return 'nonceTooLow';
  }

  get replacementTxUnderpricedStatus() {
    return 'replacementTxUnderpriced';
  }

  get gethOutOfSyncStatus() {
    return 'gethOutOfSync';
  }

  get unknownGethSubmissionErrorStatus() {
    return 'unknownError';
  }

  // Status constants ends.

  // Kind constants starts.
  get ruleExecution() {
    return 'ruleExecution';
  }
  // Kind constants ends.
}

module.exports = new TransactionMetaConstants();
