'use strict';

/**
 * Executable transaction executable
 *
 * @module executables/executeTransaction
 */
const program = require('commander'),
  OSTBase = require('@ostdotcom/base');

const rootPrefix = '../..',
  MultiSubscriptionBase = require(rootPrefix + '/executables/rabbitmq/MultiSubscriptionBase'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  RabbitmqSubscription = require(rootPrefix + '/lib/entity/RabbitSubscription'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  WebhookQueueModel = require(rootPrefix + '/app/models/mysql/WebhookQueue'),
  webhookProcessorConstants = require(rootPrefix + '/lib/globalConstant/webhookProcessor'),
  rabbitmqConstant = require(rootPrefix + '/lib/globalConstant/rabbitmq');

const InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/lib/transactions/ProcessRmqMessage');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/executeTransaction.js --cronProcessId 18');
  logger.log('');
  logger.log('');
});

let cronProcessId = +program.cronProcessId;
if (!cronProcessId) {
  program.help();
  process.exit(1);
}

/**
 * Class for Execute Transaction Process.
 *
 * @class
 */
class WebhookPublisherExecutable extends MultiSubscriptionBase {
  /**
   * Constructor for Execute Transaction Process.
   *
   * @augments SubscriberBase
   *
   * @param {Object} params: params object
   * @param {Number} params.cronProcessId: cron_processes table id
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.cronProcessDetails = {};
    oThis.processorTopicName = null;
    oThis.auxChainId = null;
    oThis.ic = null;
  }

  /**
   * Process name prefix
   *
   * @returns {string}
   * @private
   */
  get _processNamePrefix() {
    return 'webhook_processor';
  }

  /**
   * Specific validations
   *
   * @return {Promise<boolean>}
   * @private
   */
  async _specificValidations() {
    // Add specific validations here
  }

  /**
   * Cron kind.
   *
   * @returns {string}
   * @private
   */
  get _cronKind() {
    return cronProcessesConstants.webhookProcessor;
  }

  /**
   * Before subscribe
   *
   * @return {Promise<void>}
   * @private
   */
  async _beforeSubscribe() {
    const oThis = this;

    // Query to get queue_topic suffix, chainId and whether to start consumption
    let cronProcessDetails = await new WebhookQueueModel()
      .select('*')
      .where({ cron_process_id: cronProcessId })
      .fire();
    oThis.cronProcessDetails = cronProcessDetails[0];

    // Fetch config strategy for the aux chain
    const strategyByChainHelperObj = new StrategyByChainHelper(oThis.auxChainId),
      configStrategyResp = await strategyByChainHelperObj.getComplete();

    // if config strategy fetch failed, then emit SIGINT
    if (configStrategyResp.isFailure()) {
      logger.error('Could not fetch configStrategy. Exiting the process.');
      process.emit('SIGINT');
    }

    const configStrategy = configStrategyResp.data;

    // Creating ic object using the config strategy
    oThis.ic = new InstanceComposer(configStrategy);
  }

  /**
   * Prepare subscription data.
   *
   * @returns {{}}
   * @private
   */
  _prepareSubscriptionData() {
    const oThis = this,
      queueTopicSuffix = oThis.cronProcessDetails.queue_topic_suffix;

    oThis.auxChainId = oThis.cronProcessDetails.chain_id;

    // Set topic names in oThis. Topic names are used while starting the subscription. subscribing to all topics
    oThis.processorTopicName = webhookProcessorConstants.processorTopicName(
      oThis.auxChainId,
      queueTopicSuffix,
      oThis.subscribeSubTopic
    );

    // Fetch queue names. subscribing to all topics
    let processorQueueName = webhookProcessorConstants.processorQueueName(
      oThis.auxChainId,
      queueTopicSuffix,
      oThis.subscribeSubTopic
    );

    // Set rabbitmq subscription object.
    oThis.subscriptionTopicToDataMap[oThis.processorTopicName] = new RabbitmqSubscription({
      rabbitmqKind: rabbitmqConstant.auxWebhooksProcessorRabbitmqKind,
      topic: oThis.processorTopicName,
      queue: processorQueueName,
      prefetchCount: oThis.prefetchCount,
      auxChainId: oThis.auxChainId
    });
  }

  /**
   * Start subscription
   *
   * @return {Promise<void>}
   * @private
   */
  async _startSubscription() {
    const oThis = this;

    await oThis._startSubscriptionFor(oThis.processorTopicName);
  }

  /**
   * Process message.
   *
   * @param {object} messageParams
   * @param {string} messageParams.message
   * @param {object} messageParams.message.payload
   *
   * @returns {Promise<>}
   *
   * @private
   */
  async _processMessage(messageParams) {
    console.log('-1--messageParams--------', messageParams);
    const msgParams = messageParams.message.payload;
    console.log('-2--msgParams--------', msgParams);
  }
}

new WebhookPublisherExecutable({ cronProcessId: +program.cronProcessId }).perform();

setInterval(function() {
  logger.info('Ending the process. Sending SIGINT.');
  process.emit('SIGINT');
}, cronProcessesConstants.cronRestartInterval15Mins);
