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
  submittedStatus: 'SUBMITTED',
  successStatus: 'SUCCESS',
  failedStatus: 'FAILED'
};

pendingTransaction.statuses = {
  '1': pendingTransaction.createdStatus,
  '2': pendingTransaction.submittedStatus,
  '3': pendingTransaction.successStatus,
  '4': pendingTransaction.failedStatus
};

pendingTransaction.invertedStatuses = util.invert(pendingTransaction.statuses);

module.exports = pendingTransaction;
