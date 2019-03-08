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
  minedStatus: 'MINED',
  successStatus: 'SUCCESS',
  failedStatus: 'FAILED'
};

pendingTransaction.statuses = {
  '1': pendingTransaction.createdStatus,
  '2': pendingTransaction.submittedStatus,
  '3': pendingTransaction.minedStatus,
  '4': pendingTransaction.successStatus,
  '5': pendingTransaction.failedStatus
};

//If changed update in file dynamo_to_es_formatter as well.
pendingTransaction.invertedStatuses = util.invert(pendingTransaction.statuses);

module.exports = pendingTransaction;
