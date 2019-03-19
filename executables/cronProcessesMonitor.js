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
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry');

const OFFSET_TIME_IN_MSEC = 5 * 60 * 1000;

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
        [cronProcessesConstants.blockParser]: cronProcessesConstants.continuousCronRestartInterval,
        [cronProcessesConstants.transactionParser]: cronProcessesConstants.continuousCronRestartInterval,
        [cronProcessesConstants.blockFinalizer]: cronProcessesConstants.continuousCronRestartInterval,
        [cronProcessesConstants.economyAggregator]: cronProcessesConstants.continuousCronRestartInterval,
        [cronProcessesConstants.balanceSettler]: cronProcessesConstants.continuousCronRestartInterval,
        [cronProcessesConstants.workflowWorker]: cronProcessesConstants.continuousCronRestartInterval,
        [cronProcessesConstants.auxWorkflowWorker]: cronProcessesConstants.continuousCronRestartInterval
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
        currentTimeInMSecs = Math.floor(new Date().getTime()),
        lastStartedAtInMSecs = Math.floor(new Date(cronEntity.last_started_at).getTime()),
        lastEndedAtInMSecs = Math.floor(new Date(cronEntity.last_ended_at).getTime());

      logger.info('*** Monitoring cron: [', cronEntity.id, cronKind, '] on machine: ', cronEntity.ip_address);
      logger.debug('currentTimeInMSecs: ', currentTimeInMSecs);
      logger.debug('lastStartedAtInMSecs: ', lastStartedAtInMSecs);
      logger.debug('lastEndedAtInMSecs: ', lastEndedAtInMSecs);

      if (
        CommonValidators.validateZeroInteger(lastEndedAtInMSecs) &&
        CommonValidators.validateZeroInteger(lastStartedAtInMSecs)
      ) {
        logger.debug('This cron was never started yet.');
        continue;
      }

      const invertedRunningStatus = new CronProcessModel().invertedStatuses[cronProcessesConstants.runningStatus],
        invertedStoppedStatus = new CronProcessModel().invertedStatuses[cronProcessesConstants.stoppedStatus];

      if (oThis.cronKindToRestartTimeMap[cronProcessesConstants.continuousCronsType][cronKind]) {
        const restartIntervalForCron =
          oThis.cronKindToRestartTimeMap[cronProcessesConstants.continuousCronsType][cronKind];
        logger.debug('restartIntervalForCron: ', restartIntervalForCron);

        // Check last ended time for continuous crons.
        // if last running instance ended before specified offset, notify
        if (
          +cronEntity.status === +invertedStoppedStatus &&
          currentTimeInMSecs - lastEndedAtInMSecs > OFFSET_TIME_IN_MSEC
        ) {
          let errorIdentifierStr = `${cronKind}:cron_stuck:e_cpm_1`,
            debugOptions = {
              cronId: cronEntity.id,
              cronKind: cronKind,
              lastEndTimeFromCron: cronEntity.last_ended_at
            };
          await oThis._notify(errorIdentifierStr, debugOptions);
        }

        // Check last started time for continuous crons.
        // if currently running instance has wrong last started at time, notify [very rare case]
        if (
          +cronEntity.status === +invertedRunningStatus &&
          currentTimeInMSecs - lastStartedAtInMSecs > OFFSET_TIME_IN_MSEC + restartIntervalForCron
        ) {
          let errorIdentifierStr = cronKind + ':cron_stuck:e_cpm_2',
            debugOptions = {
              cronId: cronEntity.id,
              cronKind: cronKind,
              lastEndTimeFromCron: cronEntity.last_started_at
            };
          await oThis._notify(errorIdentifierStr, debugOptions);
        }
      }

      if (oThis.cronKindToRestartTimeMap[cronProcessesConstants.periodicCronsType][cronKind]) {
        const restartIntervalForCron =
          oThis.cronKindToRestartTimeMap[cronProcessesConstants.periodicCronsType][cronKind];
        logger.debug('restartIntervalForCron---', restartIntervalForCron);

        // Check last ended time for periodic crons.
        // if last running instance ended before specified offset, notify
        if (
          +cronEntity.status === +invertedStoppedStatus &&
          currentTimeInMSecs - lastEndedAtInMSecs > OFFSET_TIME_IN_MSEC + restartIntervalForCron
        ) {
          let errorIdentifierStr = cronKind + ':cron_stuck:e_cpm_3',
            debugOptions = {
              cronId: cronEntity.id,
              cronKind: cronKind,
              lastEndTimeFromCron: cronEntity.last_ended_at
            };
          await oThis._notify(errorIdentifierStr, debugOptions);
        }
        // Check last started time for periodic crons.
        // if currently running instance has wrong last started at time, notify [very rare case]
        if (
          +cronEntity.status === +invertedRunningStatus &&
          currentTimeInMSecs - lastStartedAtInMSecs > OFFSET_TIME_IN_MSEC + restartIntervalForCron
        ) {
          let errorIdentifierStr = cronKind + ':cron_stuck:e_cpm_4',
            debugOptions = {
              cronId: cronEntity.id,
              cronKind: cronKind,
              lastEndTimeFromCron: cronEntity.last_started_at
            };
          await oThis._notify(errorIdentifierStr, debugOptions);
        }
      }
    }
  }

  /**
   * Insert entry in error_logs table.
   *
   * @param {String} errorIdentifier: errorIdentifier
   * @param {Object} debugOptions:  debugOptions
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _notify(errorIdentifier, debugOptions) {
    const oThis = this;

    const errorObject = responseHelper.error({
      internal_error_identifier: errorIdentifier,
      api_error_identifier: 'cron_stuck',
      debug_options: debugOptions
    });
    await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);
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
