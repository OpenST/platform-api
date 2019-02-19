'use strict';
/**
 *
 * @module lib/globalConstant/pendingTransaction
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

// Declare constants.
const pendingTransaction = {
  // Status kind enum types start
  createdStatus: 'CREATED',
  queuedStatus: 'QUEUED',
  submittedStatus: 'SUBMITTED',
  successStatus: 'SUCCESS',
  failedStatus: 'FAILED'
};

pendingTransaction.statuses = {
  '1': pendingTransaction.createdStatus,
  '2': pendingTransaction.queuedStatus,
  '3': pendingTransaction.submittedStatus,
  '4': pendingTransaction.successStatus,
  '5': pendingTransaction.failedStatus
};

pendingTransaction.invertedStatuses = util.invert(pendingTransaction.statuses);

module.exports = pendingTransaction;
