'use strict';
/**
 * Model to get cron process and its details.
 *
 * @module /lib/globalConstant/cronProcesses
 */
const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

// Declare constants.

const cronProcesses = {
  // Cron processes enum types start
  transactionDelegator: 'transactionDelegator',
    blockScannerWorker: 'blockScannerWorker',
  // Cron processes enum types end

  // Status enum types start
  runningStatus: 'running',
  stoppedStatus: 'stopped',
  inactiveStatus: 'inactive'
  //Status enum types end
},
  kind = {
  // Add cron processes here
  '1': cronProcesses.transactionDelegator,
  '2': cronProcesses.blockScannerWorker
},
  status = {
  '1': cronProcesses.runningStatus,
  '2': cronProcesses.stoppedStatus,
  '3': cronProcesses.inactiveStatus
};

cronProcesses.kinds = kind;
cronProcesses.statuses = status;
cronProcesses.invertedKinds = util.invert(kind);
cronProcesses.invertedStatuses = util.invert(status);

/**
 * Class for cron process constants
 *
 * @class
 */
class CronProcesses {
  /**
   * Constructor for cron process constants
   *
   * @constructor
   */
  constructor() {}

  get cronProcesses() {
    return cronProcesses;
  }

}

module.exports = new CronProcesses().cronProcesses;
