'use strict';

/**
 * Model to get cron process and its details.
 *
 * @module /lib/globalConstant/cronProcesses
 */

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

  // Cron processes enum types start
  get blockParser() {
    return 'blockParser';
  }
  get transactionParser() {
    return 'transactionParser';
  }
  get blockFinalizer() {
    return 'blockFinalizer';
  }
  get economyAggregator() {
    return 'economyAggregator';
  }
  get workflowWorker() {
    return 'workflowWorker';
  }
  // Cron processes enum types end

  // Status enum types start
  get runningStatus() {
    return 'running';
  }
  get stoppedStatus() {
    return 'stopped';
  }
  get inactiveStatus() {
    return 'inactive';
  }
  //Status enum types end
}

module.exports = new CronProcesses();
