'use strict';
/**
 * This periodic cron monitors the cron processes table.
 * It selects entry from table and compares the last ending time of the entry with restart time interval
 * And sends the error notification
 *
 *
 * Example: executables/cronProcessesMonitor.js 27
 *
 * @module executables/cronProcessesMonitor
 */

const rootPrefix = '..',
  CronBase = require(rootPrefix + '/executables/CronBase'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ErrorLogsConstants = require(rootPrefix + '/lib/errorLogs/ErrorLogsConstants'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  CronProcessModel = require(rootPrefix + '/app/models/mysql/CronProcesses'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

const usageDemo = function() {
  logger.log('Usage:', 'node executables/cronProcessesMonitor.js cronProcessId');
  logger.log('* cronProcessId is used for proper handling of cron.');
};

// Declare variables.
const args = process.argv,
  cronProcessId = parseInt(args[2]);

// Validate and sanitize the command line arguments.
if (!cronProcessId) {
  logger.error('Cron Process id NOT passed in the arguments.');
  usageDemo();
  process.exit(1);
}

class CronProcessesMonitorExecutable extends CronBase {
  /**
   *
   * @constructor
   */
  constructor() {
    let params = { cronProcessId: cronProcessId };
    super(params);
    const oThis = this;
    oThis.canExit = true;
  }

  /**
   * Start the executable.
   *
   * @returns {Promise<any>}
   *
   * @private
   */
  async _start() {
    const oThis = this;

    oThis.canExit = false;

    let cronKindToRestartTimeMap = {
      [cronProcessesConstants.continuousCronsType]: {
        [cronProcessesConstants.blockParser]: cronProcessesConstants.blockParserRestartInterval,
        [cronProcessesConstants.transactionParser]: cronProcessesConstants.transactionParserRestartInterval,
        [cronProcessesConstants.blockFinalizer]: cronProcessesConstants.finalizerRestartInterval,
        [cronProcessesConstants.economyAggregator]: cronProcessesConstants.aggregatorRestartInterval,
        [cronProcessesConstants.balanceSettler]: cronProcessesConstants.balanceSettlerRestartInterval,
        [cronProcessesConstants.workflowWorker]: cronProcessesConstants.workflowFactoryRestartInterval,
        [cronProcessesConstants.auxWorkflowWorker]: cronProcessesConstants.auxWorkflowFactoryRestartInterval,
        [cronProcessesConstants.emailNotifier]: cronProcessesConstants.notifierRestartInterval
      },
      [cronProcessesConstants.periodicCronsType]: {}
    };

    const existingCrons = await new CronProcessModel().select('*').fire(),
      existingCronsLength = existingCrons.length;

    // check last running time for continuous crons
    for (let index = 0; index < existingCronsLength; index++) {
      const cronEntity = existingCrons[index];

      if (cronKindToRestartTimeMap[cronProcessesConstants.continuousCronsType][cronEntity.kind_name]) {
        let lastEndedAtInSecs = Math.floor(new Date(cronEntity.last_ended_at).getTime() / 1000),
          currentTimeInSecs = Math.floor(new Date().getTime() / 1000),
          restartIntervalForCron =
            cronKindToRestartTimeMap[cronProcessesConstants.continuousCronsType][cronEntity.kind_name];

        logger.debug('lastEndedAtInSecs------', lastEndedAtInSecs);
        logger.debug('currentTimeInSecs-------', currentTimeInSecs);
        logger.debug('(lastEndedAtInSecs - currentTimeInSecs)-------', lastEndedAtInSecs - currentTimeInSecs);
        logger.debug('restartIntervalForCron---', restartIntervalForCron);

        if (lastEndedAtInSecs - currentTimeInSecs > restartIntervalForCron) {
          const errorObject = responseHelper.error({
            internal_error_identifier: 'cron_stuck:e_cpm_1',
            api_error_identifier: 'cron_stuck',
            debug_options: {
              cronId: cronEntity.id,
              cronKind: cronEntity.kind_name,
              lastEndTimeFromCron: cronEntity.last_ended_at
            }
          });
          createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);
        }
      }
    }

    oThis.canExit = true;

    return responseHelper.successWithData({});
  }

  /**
   * This function provides info whether the process has to exit.
   *
   * @returns {Boolean}
   *
   * @private
   */
  _pendingTasksDone() {
    const oThis = this;

    return oThis.canExit;
  }

  /**
   *
   * @private
   */
  _validateAndSanitize() {}

  /**
   *
   * @returns {String}
   *
   * @private
   */
  get _cronKind() {
    return cronProcessesConstants.cronProcessesMonitor;
  }
}

const cronProcessesMonitor = new CronProcessesMonitorExecutable();

cronProcessesMonitor
  .perform()
  .then(function() {
    logger.step('** Exiting process');
    logger.info('Cron last run at: ', Date.now());
    process.emit('SIGINT');
  })
  .catch(function(err) {
    logger.error('** Exiting process due to Error: ', err);
    process.emit('SIGINT');
  });
