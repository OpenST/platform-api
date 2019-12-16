/**
 * Module for webhooks error handler cron.
 *
 * @module executables/webhook/errorHandler
 */

const rootPrefix = '../..';

const program = require('commander');

const CronBase = require(rootPrefix + '/executables/CronBase'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  webhookErrorHandler = require(rootPrefix + '/lib/webhooks/errorHandler'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/webhook/errorHandler.js --cronProcessId 33');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

/**
 * Class for webhooks error handler cron.
 *
 * @class WebhookErrorHandlerCron
 */
class WebhookErrorHandlerCron extends CronBase {
  /**
   * Constructor for webhooks error handler cron.
   *
   * @param {object} params
   * @param {number} params.cronProcessId
   *
   * @augments CronBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.canExit = true;
  }

  /**
   * Start the executable.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _start() {
    const oThis = this;

    while (!oThis.stopPickingUpNewWork) {
      oThis.canExit = false;

      await webhookErrorHandler.perform(oThis.cronProcessId);

      oThis.canExit = true;

      logger.step('** Sleeping...');
      await basicHelper.sleep(10000);
    }
  }

  /**
   * Validate and sanitize.
   *
   * @private
   */
  _validateAndSanitize() {
    // Do nothing.
  }

  /**
   * Get cron kind.
   *
   * @returns {string}
   * @private
   */
  get _cronKind() {
    return cronProcessesConstants.webhookErrorHandler;
  }

  /**
   * This function provides info whether the process has to exit.
   *
   * @returns {boolean}
   * @private
   */
  _pendingTasksDone() {
    const oThis = this;

    return oThis.canExit;
  }
}

new WebhookErrorHandlerCron({ cronProcessId: +program.cronProcessId }).perform();

setInterval(function() {
  logger.info('Ending the process. Sending SIGINT.');
  process.emit('SIGINT');
}, cronProcessesConstants.cronRestartInterval15Mins);
