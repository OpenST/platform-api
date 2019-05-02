/**
 * This code acts as a aggregator for blocks which are finalized
 *
 * Usage: node executables/blockScanner/aggregator.js --cronProcessId <cronProcessId>
 *
 * Command Line Parameters Description:
 * cronProcessId: used for ensuring that no other process with the same cronProcessId can run on a given machine.
 *
 * @module executables/blockScanner/aggregator
 */
const program = require('commander');

const rootPrefix = '../..',
  RabbitmqSubscription = require(rootPrefix + '/lib/entity/RabbitSubscription'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  MultiSubscriptionBase = require(rootPrefix + '/executables/rabbitmq/MultiSubscriptionBase'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  rabbitmqConstant = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/blockScanner/aggregator.js --cronProcessId 1');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

/**
 * Class for aggregator.
 *
 * @class Aggregator
 */
class Aggregator extends MultiSubscriptionBase {
  /**
   * Constructor for aggregator.
   *
   * @param {object} params: params object
   * @param {number} params.cronProcessId: cron_processes table id
   *
   * @constructor
   */
  constructor(params) {
    super(params);
  }

  /**
   * Process name prefix.
   *
   * @returns {string}
   * @private
   */
  get _processNamePrefix() {
    return 'aggregator';
  }

  /**
   * Topics to subscribe.
   *
   * @returns {*[]}
   * @private
   */
  get _topicsToSubscribe() {
    const oThis = this;

    return ['aggregator_' + oThis.chainId];
  }

  /**
   * Queue name.
   *
   * @returns {string}
   * @private
   */
  get _queueName() {
    const oThis = this;

    return 'aggregator_' + oThis.chainId;
  }

  /**
   * Specific validations apart from common validations.
   *
   * @private
   */
  _specificValidations() {
    const oThis = this;

    if (!oThis.chainId) {
      logger.error('Chain ID is un-available in cron params in the database.');
      process.emit('SIGINT');
    }

    if (oThis.chainId < 0) {
      logger.error('Chain ID is invalid.');
      process.emit('SIGINT');
    }
  }

  get _cronKind() {
    return cronProcessesConstants.economyAggregator;
  }

  /**
   * Create aggregator object before subscription.
   *
   * @return {Promise<void>}
   * @private
   */
  async _beforeSubscribe() {
    // Fetch config strategy by chainId.
    const oThis = this,
      strategyByChainHelperObj = new StrategyByChainHelper(oThis.chainId),
      configStrategyResp = await strategyByChainHelperObj.getComplete();

    if (configStrategyResp.isFailure()) {
      logger.error('Could not fetch configStrategy. Exiting the process.');
      process.emit('SIGINT');
    }

    // Get blockScanner object.
    oThis.blockScannerObj = await blockScannerProvider.getInstance([oThis.chainId]);

    oThis.Aggregator = oThis.blockScannerObj.economy.Aggregator;

    logger.step('Services initialised.');
  }

  /**
   * Prepare subscription data.
   *
   * @returns {{}}
   * @private
   */
  _prepareSubscriptionData() {
    const oThis = this;

    oThis.subscriptionTopicToDataMap[oThis._topicsToSubscribe[0]] = new RabbitmqSubscription({
      rabbitmqKind: rabbitmqConstant.auxRabbitmqKind,
      topic: oThis._topicsToSubscribe[0],
      queue: oThis._queueName,
      prefetchCount: oThis.prefetchCount,
      auxChainId: oThis.chainId
    });
  }

  /**
   * This method calls aggregator for finalized transactions.
   *
   * @param {String} messageParams
   *
   * @returns {Promise<*>}
   */
  async _processMessage(messageParams) {
    const oThis = this;

    // Process request
    const payload = messageParams.message.payload;

    // Fetch params from payload.
    const chainId = payload.chainId.toString(),
      blockNumber = payload.blockNumber;

    // Create object of aggregator.
    let aggregator = new oThis.Aggregator(chainId, blockNumber);

    // Start transaction parser service.
    const aggregatorResponse = await aggregator.perform();

    if (aggregatorResponse.isSuccess()) {
      logger.log('Aggregation done for block', blockNumber);
      // ACK RMQ.
      return;
    } else {
      // Aggregation was unsuccessful.

      logger.error('e_bs_a_1', 'Error in aggregation.', 'Aggregation response: ', aggregatorResponse);
      // ACK RMQ.
      return;
    }
  }

  /**
   * Start subscription.
   *
   * @return {Promise<void>}
   * @private
   */
  async _startSubscription() {
    const oThis = this;

    await oThis._startSubscriptionFor(oThis._topicsToSubscribe[0]);
  }
}

logger.step('Economy aggregator process started.');

new Aggregator({ cronProcessId: +program.cronProcessId }).perform();

setInterval(function() {
  logger.info('Ending the process.');
  process.emit('SIGINT');
}, cronProcessesConstants.cronRestartInterval5Mins);
