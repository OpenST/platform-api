'use strict';
/**
 * Transaction finalizer task constants
 *
 * @module lib/globalConstant/transactionFinalizerTask
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

let statuses, invertedStatuses;

/**
 * Class for Transaction finalizer task constants
 *
 * @class
 */
class TransactionFinalizerConstants {
  /**
   *
   * @constructor
   */
  constructor() {}

  // Status constants starts.

  get pendingStatus() {
    return 'pending';
  }

  get failedStatus() {
    return 'failed';
  }

  // Status constants ends.

  get statuses() {
    const oThis = this;
    if (statuses) return statuses;
    statuses = {
      '1': oThis.pendingStatus,
      '2': oThis.failedStatus
    };
    return statuses;
  }

  get invertedStatuses() {
    const oThis = this;
    if (invertedStatuses) return invertedStatuses;
    invertedStatuses = util.invert(oThis.statuses);
    return invertedStatuses;
  }
}

module.exports = new TransactionFinalizerConstants();
