'use strict';
/**
 * This code acts as a aggregator for blocks which are finalized
 *
 * Usage: node executables/blockScanner/Aggregator.js --cronProcessId <cronProcessId>
 *
 * Command Line Parameters Description:
 * cronProcessId: used for ensuring that no other process with the same cronProcessId can run on a given machine.
 *
 * @module executables/blockScanner/Aggregator
 */

const rootPrefix = '../..',
  program = require('commander'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  SubscriberBase = require(rootPrefix + '/executables/rabbitmq/SubscriberBase');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/blockScanner/Aggregator.js --cronProcessId 1');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

class Aggregator extends SubscriberBase {
  /**
   * Constructor for transaction parser
   *
   * @param params {object} - params object
   * @param params.cronProcessId {number} - cron_processes table id
   *
   * @constructor
   */
  constructor(params) {
    super(params);
  }

  /**
   * process name prefix
   *
   * @returns {string}
   * @private
   */
  get _processNamePrefix() {
    return 'aggregator';
  }

  /**
   * topics to subscribe
   *
   * @returns {*[]}
   * @private
   */
  get _topicsToSubscribe() {
    const oThis = this;

    return ['aggregator_' + oThis.chainId];
  }

  /**
   * queue name
   *
   * @returns {string}
   * @private
   */
  get _queueName() {
    const oThis = this;

    return 'aggregator_' + oThis.chainId;
  }

  /**
   * Specific validations apart from common validations
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
   * _beforeSubscribe - Create aggregator object before subscription
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
   * This method calls aggregator for finalized transactions
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
      logger.debug('------unAckCount -> ', oThis.unAckCount);
      // ACK RMQ.
      return Promise.resolve();
    } else {
      // Aggregation was unsuccessful.

      logger.error(
        'e_bs_a_1',
        'Error in aggregation. unAckCount ->',
        oThis.unAckCount,
        'Aggregation response: ',
        aggregatorResponse
      );
      // ACK RMQ.
      return Promise.resolve();
    }
  }
}

logger.step('Economy aggregator process started.');

new Aggregator({ cronProcessId: +program.cronProcessId }).perform();

setInterval(function() {
  logger.info('Ending the process.');
  process.emit('SIGINT');
}, 45 * 60 * 1000);
