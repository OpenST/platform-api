/**
 * Module for fetching entries from error_logs table.
 *
 * @module lib/errorLogs/processErrorLogs
 */

const program = require('commander');

const rootPrefix = '../..',
  ErrorLogsModel = require(rootPrefix + '/lib/errorLogs/ErrorLogsModel'),
  HighSeverityProcessor = require(rootPrefix + '/lib/errorLogs/HighSeverityProcessor'),
  MediumAndLowSeverityProcessor = require(rootPrefix + '/lib/errorLogs/MediumAndLowSeverityProcessor'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ErrorLogsConstants = require(rootPrefix + '/lib/errorLogs/ErrorLogsConstants');

program.option('--severities <severities>', 'Severities').parse(process.argv);

program.on('--help', function() {
  console.log('');
  console.log('  Example:');
  console.log('');
  console.log("    node lib/errorLogs/fetchEntriesCron.js --severities ['high', 'medium']");
  console.log('');
  console.log('');
});

const severities = program.severities;
if (!severities) {
  program.help();
  process.exit(1);
}

/**
 * Class for fetching entries from error_logs table.
 *
 * @class ProcessErrorLogs
 */
class ProcessErrorLogs {
  /**
   * Constructor for fetching entries from error_logs table.
   *
   * @param {Array} severities
   *
   * @constructor
   */
  constructor(severities) {
    const oThis = this;

    oThis.severities = severities;

    oThis.batchSize = 10;
    oThis.canExit = true;
    oThis.stopPickingUpNewWork = false;

    oThis._attachHandlers(); // Attach handlers for SIGINT and SIGTERM.
  }

  /**
   * Performer method for class.
   *
   * @return {*}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      }
      console.error(`${__filename}::perform::catch`);
      console.error(error);

      return responseHelper.error({
        internal_error_identifier: 'l_el_fe_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    });
  }

  /**
   * Async performer.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    oThis._validateSeverities();

    // Process high severity errors if they need to be processed.
    if (severities.includes(ErrorLogsConstants.highSeverity)) {
      await oThis._processHighSeverityErrors();
      console.log('High severity errors processed.');
    }

    // Process medium severity errors if they need to be processed.
    if (severities.includes(ErrorLogsConstants.mediumSeverity)) {
      await oThis._processMediumAndLowSeverityErrors(ErrorLogsConstants.mediumSeverity);
      console.log('Medium severity errors processed.');
    }

    // Process low severity errors if they need to be processed.
    if (severities.includes(ErrorLogsConstants.lowSeverity)) {
      await oThis._processMediumAndLowSeverityErrors(ErrorLogsConstants.lowSeverity);
      console.log('Low severity errors processed.');
    }

    console.log('Actions for all error rows successfully completed.');
  }

  /**
   * Validate severities array passed.
   *
   * @private
   */
  _validateSeverities() {
    const oThis = this;

    for (let index = 0; index < oThis.severities.length; index++) {
      const severity = oThis.severities[index];
      if (!ErrorLogsConstants.severities.includes(severity)) {
        console.error(`Invalid severity passed. Severity: ${severity}`);
        throw new Error(`Invalid severity passed. Severity: ${severity}`);
      }
    }
  }

  /**
   * Process high severity errors.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _processHighSeverityErrors() {
    const oThis = this;
    const errorEntries = await new ErrorLogsModel()
      .select('*')
      .where(['severity = (?) AND status = (?)', ErrorLogsConstants.highSeverity, ErrorLogsConstants.createdStatus])
      .limit(ErrorLogsConstants.queryLimits[ErrorLogsConstants.highSeverity])
      .fire();

    while (errorEntries.length > 0) {
      if (oThis.stopPickingUpNewWork) {
        break;
      }
      oThis.canExit = false;

      const currentBatch = errorEntries.splice(0, oThis.batchSize);

      await new HighSeverityProcessor(currentBatch).perform();
      oThis.canExit = true;
    }
  }

  /**
   * Process medium and low severity errors.
   *
   * @param {String} severity
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _processMediumAndLowSeverityErrors(severity) {
    const oThis = this;
    const errorEntries = await new ErrorLogsModel()
      .select('*')
      .where(['severity = (?) AND status = (?)', severity, ErrorLogsConstants.createdStatus])
      .limit(ErrorLogsConstants.queryLimits[severity])
      .fire();

    while (errorEntries.length > 0) {
      if (oThis.stopPickingUpNewWork) {
        break;
      }
      oThis.canExit = false;

      const currentBatch = errorEntries.splice(0, oThis.batchSize);

      await new MediumAndLowSeverityProcessor(currentBatch).perform();
      oThis.canExit = true;
    }
  }

  // Functions related to SIGINT/SIGTERM handling start from here.

  /**
   * Attach SIGINT/SIGTERM handlers to the current process.
   *
   * @private
   */
  _attachHandlers() {
    const oThis = this;

    const handle = function() {
      oThis._stopPickingUpNewTasks();

      if (oThis._pendingTasksDone()) {
        console.info(':: No pending tasks. Changing the status ');
        console.info('Killing process.');

        // Stop the process only after the entry has been updated in the table.
        process.exit(1);
      } else {
        console.info(':: There are pending tasks. Waiting for completion.');
        setTimeout(handle, 1000);
      }
    };

    process.on('SIGINT', handle);
    process.on('SIGTERM', handle);
  }

  /**
   * Stops consumption upon invocation.
   *
   * @private
   */
  _stopPickingUpNewTasks() {
    const oThis = this;

    console.info(':: _stopPickingUpNewTasks called');

    oThis.stopPickingUpNewWork = true;
  }

  /**
   * Pending tasks done
   *
   * @return {Boolean}
   *
   * @private
   */
  _pendingTasksDone() {
    const oThis = this;

    return oThis.canExit;
  }
}

// Perform action.
new ProcessErrorLogs(severities)
  .perform()
  .then(function() {
    process.emit('SIGINT');
  })
  .catch(function() {
    process.emit('SIGINT');
  });
