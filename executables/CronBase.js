'use strict';

const rootPrefix = '..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  cronProcessHandler = require(rootPrefix + '/lib/CronProcessesHandler'),
  cronProcessHandlerObject = new cronProcessHandler(),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class for sigint handler
 *
 * @class
 */
class CronBase {
  /**
   * Constructor for sigint handler
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.cronProcessId = params.cronProcessId;

    oThis.attachHandlers(); // Attaching handlers from sigint handler.
  }

  /**
   * Main performer method for the class.
   *
   * @returns {Promise<>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      // If asyncPerform fails, run the below catch block.
      logger.error('error in executables/CronBase.js');
      return responseHelper.error({
        internal_error_identifier: 'e_bs_w_2',
        api_error_identifier: 'something_went_wrong',
        debug_options: err
      });
    });
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis._validateCronProcess();

    oThis._validateAndSanitize();

    await oThis._start();
  }

  /**
   * Attach SIGINT/SIGTERM handlers to the current process.
   */
  attachHandlers() {
    const oThis = this;

    let handle = function() {
      oThis.stopPickingUpNewTasks();

      if (oThis._pendingTasksDone()) {
        logger.info(':: No pending tasks. Changing the status ');
        cronProcessHandlerObject.stopProcess(oThis.cronProcessId).then(function() {
          logger.info('Status and last_ended_at updated in table. Killing process.');

          // Stop the process only after the entry has been updated in the table.
          process.exit(1);
        });
      } else {
        logger.info(':: There are pending tasks. Waiting for completion.');
        setTimeout(handle, 1000);
      }
    };

    process.on('SIGINT', handle);
    process.on('SIGTERM', handle);
  }

  /**
   * Stops consumption upon invocation
   */
  stopPickingUpNewTasks() {
    const oThis = this;

    oThis.stopPickingUpNewWork = true;
    if (oThis.consumerTag) {
      logger.info(':: :: Cancelling consumption on tag=====', oThis.consumerTag);
      process.emit('CANCEL_CONSUME', oThis.consumerTag);
    }
  }

  async _validateCronProcess() {
    const oThis = this;

    let response = await cronProcessHandlerObject.canStartProcess({
      id: oThis.cronProcessId, // Implicit string to int conversion.
      cronKind: oThis._cronKind
    });

    try {
      // Fetch params from the DB.
      let cronParams = JSON.parse(response.data.params);

      for (let k in cronParams) {
        oThis[k] = cronParams[k];
      }
    } catch (err) {
      logger.error('cronParams stored in INVALID format in the DB.');
      logger.error(
        'The status of the cron was NOT changed to stopped. Please check the status before restarting the cron'
      );
      logger.error('Error: ', err);
      process.exit(1);
    }
  }

  /**
   * This function provides info whether the process has to exit.
   */
  _pendingTasksDone() {
    throw '_pendingTasksDone method should be implemented by the caller for SIGINT handling';
  }

  _start() {
    throw 'sub class to implement.';
  }

  _validateAndSanitize() {
    throw 'sub class to implement.';
  }

  get _cronKind() {
    throw 'sub class to implement.';
  }
}

module.exports = CronBase;
