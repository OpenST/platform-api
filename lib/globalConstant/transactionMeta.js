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
      '1': oThis.queued,
      '2': oThis.queuedFailed
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

  get nextActionAtDelta() {
    const oThis = this;
    return {
      [oThis.queued]: 1800 //30 minutes
    };
  }

  getNextActionAtFor(status) {
    const oThis = this;
    let waitTimeForProcessingSec = oThis.nextActionAtDelta[status],
      currentTimeStampInSeconds = new Date().getTime() / 1000;

    return currentTimeStampInSeconds + waitTimeForProcessingSec;
  }

  // Status constants starts.
  get queued() {
    return 'queued';
  }

  get queuedFailed() {
    return 'queuedFailed';
  }
  // Status constants ends.

  // Kind constants starts.
  get ruleExecution() {
    return 'ruleExecution';
  }
  // Kind constants ends.
}

module.exports = new TransactionMetaConstants();
