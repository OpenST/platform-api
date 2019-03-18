/**
 * Class for sigint handler.
 *
 * @module executables/CronBase
 */
const rootPrefix = '..',
  CronProcessHandler = require(rootPrefix + '/lib/CronProcessesHandler'),
  ErrorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  cronProcessHandlerObject = new CronProcessHandler(),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry');

/**
 * Class for sigint handler.
 *
 * This class has 2 responsibilities
 * 1. sigint handling
 * 2. cron processes table queries and validations
 *
 * @class CronBase
 */
class CronBase {
  /**
   * Constructor for sigint handler.
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.cronProcessId = params.cronProcessId;

    oThis.stopPickingUpNewWork = false;

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
      logger.error('Error in executables/CronBase.js');

      return responseHelper.error({
        internal_error_identifier: 'e_bs_w_1',
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

    /*
      send error notification function
      if cron doesn't stop after 60 secs of receiving SIGINT, send error notification
     */
    const sendNotification = function() {
      const errorObject = responseHelper.error({
        internal_error_identifier: oThis._cronKind + ' :cron_stuck:e_bs_w_2',
        api_error_identifier: 'cron_stuck',
        debug_options: {
          cronProcessId: oThis.cronProcessId,
          cronName: oThis._cronKind
        }
      });
      createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);
    };

    setTimeout(sendNotification, 60000);

    const handle = function() {
      oThis._stopPickingUpNewTasks();

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
  _stopPickingUpNewTasks() {
    const oThis = this;

    logger.info(':: _stopPickingUpNewTasks called');

    oThis.stopPickingUpNewWork = true;
  }

  /**
   * Validate cron process.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _validateCronProcess() {
    const oThis = this;

    const response = await cronProcessHandlerObject.canStartProcess({
      id: oThis.cronProcessId, // Implicit string to int conversion.
      cronKind: oThis._cronKind
    });

    try {
      // Fetch params from the DB.
      const cronParams = JSON.parse(response.data.params);

      for (const key in cronParams) {
        oThis[key] = cronParams[key];
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
    throw new Error('Sub-class to implement.');
  }

  _start() {
    throw new Error('Sub-class to implement.');
  }

  _validateAndSanitize() {
    throw new Error('Sub-class to implement.');
  }

  get _cronKind() {
    throw new Error('Sub-class to implement.');
  }
}

module.exports = CronBase;
