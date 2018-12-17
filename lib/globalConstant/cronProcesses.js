'use strict';

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

const cronProcesses = {
  // Cron processes enum types start

  blockScanner: 'blockScanner',

  // Cron processes enum types end

  // Status enum types start

  runningStatus: 'running',

  stoppedStatus: 'stopped',

  inactiveStatus: 'inactive'

  //Status enum types end
};

const kind = {
  //add cron processes here
  '1': cronProcesses.blockScanner
};

const status = {
  '1': cronProcesses.runningStatus,
  '2': cronProcesses.stoppedStatus,
  '3': cronProcesses.inactiveStatus
};

cronProcesses.kinds = kind;
cronProcesses.statuses = status;
cronProcesses.invertedKinds = util.invert(kind);
cronProcesses.invertedStatuses = util.invert(status);

module.exports = cronProcesses;
