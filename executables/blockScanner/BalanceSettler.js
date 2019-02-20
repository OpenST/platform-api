'use strict';
/**
 * Class for settling the balance of user
 *
 * Usage: node executables/transaction/finalize/BalanceSettler.js --cronProcessId <cronProcessId>
 *
 * Command Line Parameters Description:
 * cronProcessId: used for ensuring that no other process with the same cronProcessId can run on a given machine.
 *
 * @module executables/transaction/finalize/BalanceSettler
 */

const rootPrefix = '../..',
  program = require('commander'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  BalanceSettlerLib = require(rootPrefix + '/lib/transactions/finalize/BalanceSettler'),
  TransactionFinalizerTask = require(rootPrefix + '/app/models/mysql/TransactionFinalizerTask'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  RabbitmqSubscription = require(rootPrefix + '/lib/entity/RabbitSubscription'),
  rabbitmqConstants = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  MultiSubscriptionBase = require(rootPrefix + '/executables/rabbitmq/MultiSubscriptionBase');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/transaction/finalize/BalanceSettler.js --cronProcessId 1');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

class BalanceSettler extends MultiSubscriptionBase {
  /**
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
    return 'transaction_finalizer';
  }

  /**
   * topics to subscribe
   *
   * @returns {*[]}
   * @private
   */
  get _topicsToSubscribe() {
    const oThis = this;

    return ['transaction_finalizer_' + oThis.chainId];
  }

  /**
   * queue name
   *
   * @returns {string}
   * @private
   */
  get _queueName() {
    const oThis = this;

    return 'transaction_finalizer_' + oThis.chainId;
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
    return cronProcessesConstants.balanceSettler;
  }

  /**
   * _beforeSubscribe - Create balance settler object before subscription
   *
   * @return {Promise<void>}
   * @private
   */
  async _beforeSubscribe() {
    // Fetch config strategy by chainId.
    const oThis = this,
      strategyByChainHelperObj = new StrategyByChainHelper(oThis.chainId),
      configStrategyResp = await strategyByChainHelperObj.getComplete();

    if (configStrategyResp.isFailure() || !CommonValidators.validateObject(configStrategyResp.data)) {
      logger.error('Could not fetch configStrategy. Exiting the process.');
      process.emit('SIGINT');
    }

    logger.step('Initialization done.');
  }

  /**
   * Prepare subscription data.
   *
   * @returns {{}}
   * @private
   */
  _prepareSubscriptionData() {
    const oThis = this;

    oThis.auxChainId = oThis.initProcessResp.processDetails.chainId;

    oThis.subscriptionTopicToDataMap[oThis._topicsToSubscribe] = new RabbitmqSubscription({
      rabbitmqKind: rabbitmqConstants.auxRabbitmqKind,
      topic: oThis._topicsToSubscribe,
      queue: oThis._queueName,
      prefetchCount: oThis.prefetchCount,
      auxChainId: oThis.auxChainId
    });
  }

  /**
   * This method calls balance settler for settling balances of the user
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
    const taskId = payload.taskId;

    let transactionFinalizerTask = new TransactionFinalizerTask();

    let pendingTasks = await transactionFinalizerTask.fetchTask(taskId);

    if (pendingTasks.length <= 0 || !pendingTasks[0].transaction_hashes) {
      logger.error(
        'e_bs_bs_1',
        'Task not found for balance settler. unAckCount ->',
        oThis.unAckCount,
        'Could not fetch details for pending task: ',
        taskId
      );
      // ACK RMQ.
      return Promise.resolve();
    }

    let balanceSettler = new BalanceSettlerLib({
      auxChainId: oThis.chainId,
      taskId: taskId,
      transactionHashes: JSON.parse(pendingTasks[0].transaction_hashes)
    });

    let balanceSettlerResponse = await balanceSettler.perform();

    if (balanceSettlerResponse.isSuccess()) {
      logger.log('Balance settling done for taskId', taskId);
      logger.debug('------unAckCount -> ', oThis.unAckCount);
      // ACK RMQ.
      return Promise.resolve();
    } else {
      logger.error(
        'e_bs_bs_2',
        'Error in Balance settlement. unAckCount ->',
        oThis.unAckCount,
        'Balance settler response: ',
        balanceSettlerResponse.toHash()
      );
      // ACK RMQ.
      return Promise.resolve();
    }
  }
}

logger.step('Balance settler process started.');

new BalanceSettler({ cronProcessId: +program.cronProcessId }).perform();

setInterval(function() {
  logger.info('Ending the process.');
  process.emit('SIGINT');
}, 30 * 60 * 1000);
