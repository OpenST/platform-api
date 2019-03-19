/**
 * This periodic cron monitors the cron processes table.
 * It selects entry from table and compares the last ending time of the entry with restart time interval
 * And sends the error notification
 *
 * Example: node executables/cronProcessesMonitor.js 27
 *
 * @module executables/cronProcessesMonitor
 */

const rootPrefix = '..',
  CronBase = require(rootPrefix + '/executables/CronBase'),
  ErrorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  CronProcessModel = require(rootPrefix + '/app/models/mysql/CronProcesses'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry');

const OFFSET_TIME_IN_SEC = 5 * 60;

const usageDemo = function() {
  logger.log('Usage: ', 'node executables/cronProcessesMonitor.js cronProcessId');
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

/**
 * Class for cron processes monitor.
 *
 * @class CronProcessesMonitorExecutable
 */
class CronProcessesMonitorExecutable extends CronBase {
  /**
   * Constructor for cron processes monitor.
   *
   * @augments CronBase
   *
   * @constructor
   */
  constructor() {
    const params = { cronProcessId: cronProcessId };

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

    oThis.cronKindToRestartTimeMap = {
      [cronProcessesConstants.continuousCronsType]: {
        [cronProcessesConstants.blockParser]: cronProcessesConstants.blockParserRestartInterval,
        [cronProcessesConstants.transactionParser]: cronProcessesConstants.transactionParserRestartInterval,
        [cronProcessesConstants.blockFinalizer]: cronProcessesConstants.finalizerRestartInterval,
        [cronProcessesConstants.economyAggregator]: cronProcessesConstants.aggregatorRestartInterval,
        [cronProcessesConstants.balanceSettler]: cronProcessesConstants.balanceSettlerRestartInterval,
        [cronProcessesConstants.workflowWorker]: cronProcessesConstants.workflowFactoryRestartInterval,
        [cronProcessesConstants.auxWorkflowWorker]: cronProcessesConstants.auxWorkflowFactoryRestartInterval
      },
      // Restart interval time for periodic crons should match with devops- cron config file
      [cronProcessesConstants.periodicCronsType]: {
        [cronProcessesConstants.fundByMasterInternalFunderAuxChainSpecificChainAddresses]: 5 * 60 * 1000,
        [cronProcessesConstants.fundByMasterInternalFunderOriginChainSpecific]: 5 * 60 * 1000,
        [cronProcessesConstants.fundBySealerAuxChainSpecific]: 5 * 60 * 1000,
        [cronProcessesConstants.fundByTokenAuxFunderAuxChainSpecific]: 5 * 60 * 1000,
        [cronProcessesConstants.fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses]: 5 * 60 * 1000,
        [cronProcessesConstants.fundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses]:
          6 * 60 * 1000,
        [cronProcessesConstants.fundByTokenAuxFunderToExTxWorkers]: 15 * 60 * 1000,
        [cronProcessesConstants.originToAuxStateRootSync]: 1 * 24 * 60 * 60 * 1000,
        [cronProcessesConstants.auxToOriginStateRootSync]: 1 * 24 * 60 * 60 * 1000,
        [cronProcessesConstants.updatePriceOraclePricePoints]: 55 * 60 * 1000,
        [cronProcessesConstants.executeRecovery]: 10 * 60 * 1000
      }
    };

    await oThis._monitor();

    oThis.canExit = true;

    return responseHelper.successWithData({});
  }

  /**
   * Monitor cron processes.
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _monitor() {
    const oThis = this;

    const existingCrons = await new CronProcessModel().select('*').fire(),
      existingCronsLength = existingCrons.length;

    for (let index = 0; index < existingCronsLength; index++) {
      const cronEntity = existingCrons[index],
        cronKind = cronEntity.kind_name,
        currentTimeInSecs = Math.floor(new Date().getTime() / 1000),
        lastStartedAtInSecs = Math.floor(new Date(cronEntity.last_started_at).getTime() / 1000),
        lastEndedAtInSecs = Math.floor(new Date(cronEntity.last_ended_at).getTime() / 1000);

      logger.info('--------------checking for cron: ', cronKind, ' on machine: ', cronEntity.ip_address);
      logger.debug('lastStartedAtInSecs: ', lastStartedAtInSecs);
      logger.debug('lastEndedAtInSecs: ', lastEndedAtInSecs);

      if (oThis.cronKindToRestartTimeMap[cronProcessesConstants.continuousCronsType][cronKind]) {
        const restartIntervalForCron =
          oThis.cronKindToRestartTimeMap[cronProcessesConstants.continuousCronsType][cronKind];
        logger.debug('restartIntervalForCron---', restartIntervalForCron);

        logger.debug('(currentTimeInSecs - lastEndedAtInSecs)-------', currentTimeInSecs - lastEndedAtInSecs);
        logger.debug(
          '(lastStartedAtInSecs + restartIntervalForCron)-------',
          restartIntervalForCron + lastStartedAtInSecs
        );

        // Check last running time and last start time for continuous crons.
        if (
          currentTimeInSecs - lastEndedAtInSecs > restartIntervalForCron + OFFSET_TIME_IN_SEC ||
          lastStartedAtInSecs + restartIntervalForCron > currentTimeInSecs - OFFSET_TIME_IN_SEC
        ) {
          const errorObject = responseHelper.error({
            internal_error_identifier: cronKind + ':cron_stuck:e_cpm_1',
            api_error_identifier: 'cron_stuck',
            debug_options: {
              cronId: cronEntity.id,
              cronKind: cronKind,
              lastEndTimeFromCron: cronEntity.last_ended_at
            }
          });
          await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);
        }
      }

      if (oThis.cronKindToRestartTimeMap[cronProcessesConstants.periodicCronsType][cronKind]) {
        const restartIntervalForCron =
          oThis.cronKindToRestartTimeMap[cronProcessesConstants.periodicCronsType][cronKind];
        logger.debug('restartIntervalForCron---', restartIntervalForCron);

        logger.debug('(currentTimeInSecs - lastEndedAtInSecs)-------', currentTimeInSecs - lastEndedAtInSecs);
        logger.debug(
          '(lastStartedAtInSecs + restartIntervalForCron)-------',
          restartIntervalForCron + lastStartedAtInSecs
        );

        // Check last running time and last start time for periodic crons.
        if (
          currentTimeInSecs - lastEndedAtInSecs > restartIntervalForCron + OFFSET_TIME_IN_SEC ||
          lastStartedAtInSecs + restartIntervalForCron > currentTimeInSecs - OFFSET_TIME_IN_SEC
        ) {
          const errorObject = responseHelper.error({
            internal_error_identifier: cronKind + ':cron_stuck:e_cpm_2',
            api_error_identifier: 'cron_stuck',
            debug_options: {
              cronId: cronEntity.id,
              cronKind: cronKind,
              lastEndTimeFromCron: cronEntity.last_ended_at
            }
          });
          await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);
        }
      }
    }
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
   * Run validations on input parameters.
   *
   * @private
   */
  _validateAndSanitize() {}

  /**
   * Get cron kind.
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
