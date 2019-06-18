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
  UpdatePricePointsRouter = require(rootPrefix + '/lib/workflow/updatePricePoints/Router'),
  AllQuoteCurrencySymbols = require(rootPrefix + '/lib/cacheManagement/shared/AllQuoteCurrencySymbols'),
  StakeCurrencyBySymbolCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyBySymbol'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  workflowTopicConstants = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

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

    let stakeCurrencyBySymbolCache = new StakeCurrencyBySymbolCache({
      stakeCurrencySymbols: [oThis.baseCurrency]
    });

    let cacheResponse = await stakeCurrencyBySymbolCache.fetch();

    if (!cacheResponse.data.hasOwnProperty(oThis.baseCurrency)) {
      logger.error('Please pass a valid base currency.');

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_upp_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: { auxChainId: oThis.auxChainId, baseCurrency: oThis.baseCurrency }
        })
      );
    }

    let allQuoteCurrencySymbolsCache = new AllQuoteCurrencySymbols({});

    let quoteCurrencyData = await allQuoteCurrencySymbolsCache.fetch();

    oThis.quoteCurrencies = quoteCurrencyData.data;

    const workflowModelQueryRsp = await new WorkflowModel()
      .select('*')
      .where({
        kind: new WorkflowModel().invertedKinds[workflowConstants.updatePricePointKind],
        status: new WorkflowModel().invertedStatuses[workflowConstants.inProgressStatus]
      })
      .fire();

    for (let index = 0; index < workflowModelQueryRsp.length; index++) {
      const requestParams = JSON.parse(workflowModelQueryRsp[index].request_params);
      if (requestParams.auxChainId === oThis.auxChainId && requestParams.baseCurrency == oThis.baseCurrency) {
        const errorObject = responseHelper.error({
          internal_error_identifier: 'cron_already_running:e_upp_3',
          api_error_identifier: 'cron_already_running',
          debug_options: { chainId: requestParams.auxChainId, baseCurrency: oThis.baseCurrency }
        });

        logger.error('Cron already running for this chain. Exiting the process.');
        return Promise.reject(errorObject);
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

    let promiseArray = [];

    for (let i = 0; i < oThis.quoteCurrencies.length; i++) {
      const updatePricePointParams = {
          stepKind: workflowStepConstants.updatePricePointInit,
          taskStatus: workflowStepConstants.taskReadyToStart,
          chainId: oThis.auxChainId,
          topic: workflowTopicConstants.updatePricePoint,
          requestParams: {
            auxChainId: oThis.auxChainId,
            baseCurrency: oThis.baseCurrency,
            quoteCurrency: oThis.quoteCurrencies[i]
          }
        },
        updatePricePointsRouterObj = new UpdatePricePointsRouter(updatePricePointParams);

      promiseArray.push(updatePricePointsRouterObj.perform());
    }

    await Promise.all(promiseArray);
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
