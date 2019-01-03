'use strict';

/**
 *
 * @module lib/globalConstant/workflowSteps
 */
const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

// Declare constants.

const workflowStepsConstants = {
  s1: 's1',

  s2: 's2',

  queuedStatus: 'queued',

  pendingStatus: 'pending',

  processedStatus: 'processed',

  failedStatus: 'failed',

  timeoutStatus: 'time_out'
};

module.exports = workflowStepsConstants;
