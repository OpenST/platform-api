/**
 * This script will update price oracle price points using ost-price-oracle npm package.
 * This fetches OST Current price in given currency from coin market cap and sets it in price oracle.
 *
 * Usage: node executables/updatePricePoints.js --cronProcessId 13
 *
 * @module executables/updatePricePoints
 *
 * This cron expects auxChainId and quoteCurrency in cron params. quoteCurrency is an optional parameter.
 */

const program = require('commander');

const rootPrefix = '..',
  CronBase = require(rootPrefix + '/executables/CronBase'),
  WorkflowModel = require(rootPrefix + '/app/models/mysql/Workflow'),
  ErrorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  UpdatePricePointsRouter = require(rootPrefix + '/lib/workflow/updatePricePoints/Router'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  workflowTopicConstants = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  conversionRateConstants = require(rootPrefix + '/lib/globalConstant/conversionRates');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/updatePricePoints.js --cronProcessId 13');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

/**
 * Class to update price oracle price points periodically.
 *
 * @class UpdatePriceOraclePricePoints
 */
class UpdatePriceOraclePricePoints extends CronBase {
  /**
   * Constructor to update price oracle price points periodically.
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
   * Cron kind.
   *
   * @return {string}
   * @private
   */
  get _cronKind() {
    return cronProcessesConstants.updatePriceOraclePricePoints;
  }

  /**
   * Validate and sanitize.
   *
   * @return {Promise<never>}
   * @private
   */
  async _validateAndSanitize() {
    const oThis = this;

    if (!oThis.auxChainId) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_upp_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { auxChainId: oThis.auxChainId }
        })
      );
    }

    if (oThis.quoteCurrency && !conversionRateConstants.invertedKinds[oThis.quoteCurrency]) {
      logger.error('Please pass a valid quote currency.');

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_upp_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: { auxChainId: oThis.auxChainId }
        })
      );
    }

    const workflowModelQueryRsp = await new WorkflowModel()
      .select('*')
      .where({
        kind: new WorkflowModel().invertedKinds[workflowConstants.updatePricePointKind],
        status: new WorkflowModel().invertedStatuses[workflowConstants.inProgressStatus]
      })
      .fire();

    for (let index = 0; index < workflowModelQueryRsp.length; index++) {
      const requestParams = JSON.parse(workflowModelQueryRsp[index].request_params);
      if (requestParams.auxChainId === oThis.auxChainId) {
        const errorObject = responseHelper.error({
          internal_error_identifier: 'cron_stopped:cron_already_running:e_upp_3',
          api_error_identifier: 'cron_stopped',
          debug_options: { chainId: requestParams.auxChainId }
        });

        await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);

        logger.error('Cron already running for this chain. Exiting the process.');
        oThis.canExit = true;
        process.emit('SIGINT');
        await basicHelper.sleep(5 * 1000);
      }
    }
  }

  /**
   * Pending tasks done.
   *
   * @return {boolean}
   * @private
   */
  _pendingTasksDone() {
    const oThis = this;

    return oThis.canExit;
  }

  /**
   * Start the cron.
   *
   * @return {Promise<void>}
   * @private
   */
  async _start() {
    const oThis = this;

    oThis.canExit = false;

    logger.step('Update price points.');
    await oThis._updatePricePoint();

    logger.step('Cron completed.');

    oThis.canExit = true;
  }

  /**
   * Update price point.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _updatePricePoint() {
    const oThis = this;

    const updatePricePointParams = {
        stepKind: workflowStepConstants.updatePricePointInit,
        taskStatus: workflowStepConstants.taskReadyToStart,
        chainId: oThis.auxChainId,
        topic: workflowTopicConstants.updatePricePoint,
        requestParams: {
          auxChainId: oThis.auxChainId,
          baseCurrency: oThis.baseCurrency
        }
      },
      updatePricePointsRouterObj = new UpdatePricePointsRouter(updatePricePointParams);

    const updatePricePointsInitResponse = await updatePricePointsRouterObj.perform();

    if (updatePricePointsInitResponse.isSuccess()) {
      return true;
    }
  }
}

// Perform action.
new UpdatePriceOraclePricePoints({ cronProcessId: +program.cronProcessId })
  .perform()
  .then(function() {
    process.emit('SIGINT');
  })
  .catch(function() {
    process.emit('SIGINT');
  });
