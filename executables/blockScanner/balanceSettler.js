'use strict';
/**
 * Class for settling the balance of user
 *
 * Usage: node executables/blockScanner/balanceSettler.js --cronProcessId <cronProcessId>
 *
 * Command Line Parameters Description:
 * cronProcessId: used for ensuring that no other process with the same cronProcessId can run on a given machine.
 *
 * @module executables/blockScanner/balanceSettler
 */

const rootPrefix = '../..',
  program = require('commander'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  rabbitmqConstant = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  RabbitmqSubscription = require(rootPrefix + '/lib/entity/RabbitSubscription'),
  MultiSubscriptionBase = require(rootPrefix + '/executables/rabbitmq/MultiSubscriptionBase');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/blockScanner/balanceSettler.js --cronProcessId 22');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/lib/transactions/finalizer/BalanceSettler');

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

    return ['transaction_finalizer_' + oThis.auxChainId];
  }

  /**
   * queue name
   *
   * @returns {string}
   * @private
   */
  get _queueName() {
    const oThis = this;

    return 'transaction_finalizer_' + oThis.auxChainId;
  }

  /**
   * Specific validations apart from common validations
   *
   * @private
   */
  _specificValidations() {
    const oThis = this;

    if (!oThis.auxChainId) {
      logger.error('Chain ID is un-available in cron params in the database.');
      process.emit('SIGINT');
    }

    if (oThis.auxChainId < 0) {
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
    const oThis = this,
      strategyByChainHelperObj = new StrategyByChainHelper(oThis.auxChainId),
      configStrategyResp = await strategyByChainHelperObj.getComplete();

    if (configStrategyResp.isFailure() || !CommonValidators.validateObject(configStrategyResp.data)) {
      logger.error('Could not fetch configStrategy. Exiting the process.');
      process.emit('SIGINT');
    }

    oThis.ic = new InstanceComposer(configStrategyResp.data);

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

    oThis.subscriptionTopicToDataMap[oThis._topicsToSubscribe[0]] = new RabbitmqSubscription({
      rabbitmqKind: rabbitmqConstant.auxRabbitmqKind,
      topic: oThis._topicsToSubscribe[0],
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

    let BalanceSettlerLib = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'BalanceSettler');

    let balanceSettler = new BalanceSettlerLib({
      auxChainId: oThis.auxChainId,
      taskId: taskId,
      cronProcessId: oThis.cronProcessId
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

  /**
   * Start subscription
   *
   * @return {Promise<void>}
   * @private
   */
  async _startSubscription() {
    const oThis = this;

    await oThis._startSubscriptionFor(oThis._topicsToSubscribe[0]);
  }

  /**
   * Increment Unack count
   *
   * @param messageParams
   * @private
   */
  _incrementUnAck(messageParams) {
    const oThis = this;

    oThis.subscriptionTopicToDataMap[oThis._topicsToSubscribe[0]].incrementUnAckCount();

    return true;
  }

  /**
   * Decrement Unack count
   *
   * @param messageParams
   * @private
   */
  _decrementUnAck(messageParams) {
    const oThis = this;

    oThis.subscriptionTopicToDataMap[oThis._topicsToSubscribe[0]].decrementUnAckCount();

    return true;
  }

  /**
   * Get Unack count.
   *
   * @param messageParams
   * @returns {number}
   * @private
   */
  _getUnAck(messageParams) {
    const oThis = this;

    return oThis.subscriptionTopicToDataMap[oThis._topicsToSubscribe[0]].unAckCount;
  }
}

logger.step('Balance settler process started.');

new BalanceSettler({ cronProcessId: +program.cronProcessId }).perform();

setInterval(function() {
  logger.info('Ending the process.');
  process.emit('SIGINT');
}, cronProcessesConstants.continuousCronRestartInterval);
