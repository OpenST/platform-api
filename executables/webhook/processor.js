/**
 * Module for webhook processor executable.
 *
 * @module executables/webhook/processor
 */

const program = require('commander'),
  OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  MultiSubscriptionBase = require(rootPrefix + '/executables/rabbitmq/MultiSubscriptionBase'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  RabbitmqSubscription = require(rootPrefix + '/lib/entity/RabbitSubscription'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  WebhookQueueModel = require(rootPrefix + '/app/models/mysql/WebhookQueue'),
  webhookProcessorConstants = require(rootPrefix + '/lib/globalConstant/webhookProcessor'),
  PublishWebhook = require(rootPrefix + '/lib/webhooks/PublishWebhook'),
  rabbitmqConstant = require(rootPrefix + '/lib/globalConstant/rabbitmq');

// Following require(s) for registering into instance composer.
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

const cronProcessId = +program.cronProcessId;
if (!cronProcessId) {
  program.help();
  process.exit(1);
}

/**
 * Class for for webhook processor executable.
 *
 * @class WebhookPublisherExecutable
 */
class WebhookPublisherExecutable extends MultiSubscriptionBase {
  /**
   * Constructor for webhook processor executable.
   *
   * @augments MultiSubscriptionBase
   *
   * @param {object} params: params object
   * @param {number} params.cronProcessId: cron_processes table id
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
   * Process name prefix.
   *
   * @returns {string}
   * @private
   */
  get _processNamePrefix() {
    return 'webhook_processor';
  }

  /**
   * Specific validations.
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
   * Before subscribe.
   *
   * @sets oThis.cronProcessDetails
   *
   * @return {Promise<void>}
   * @private
   */
  async _beforeSubscribe() {
    const oThis = this;

    // Query to get queue_topic suffix, chainId and whether to start consumption.
    const cronProcessDetails = await new WebhookQueueModel()
      .select('*')
      .where({ cron_process_id: cronProcessId })
      .fire();

    oThis.cronProcessDetails = cronProcessDetails[0];

    // Fetch config strategy for the aux chain.
    const strategyByChainHelperObj = new StrategyByChainHelper(oThis.auxChainId),
      configStrategyResp = await strategyByChainHelperObj.getComplete();

    // If config strategy fetch failed, then emit SIGINT.
    if (configStrategyResp.isFailure()) {
      logger.error('Could not fetch configStrategy. Exiting the process.');
      process.emit('SIGINT');
    }

    // Creating ic object using the config strategy.
    oThis.ic = new InstanceComposer(configStrategyResp.data);
  }

  /**
   * Prepare subscription data.
   *
   * @sets oThis.auxChainId, oThis.processorTopicName, oThis.subscriptionTopicToDataMap
   *
   * @returns {{}}
   * @private
   */
  _prepareSubscriptionData() {
    const oThis = this,
      queueTopicSuffix = oThis.cronProcessDetails.queue_topic_suffix;

    oThis.auxChainId = oThis.cronProcessDetails.chain_id;

    // Set topic names in oThis. Topic names are used while starting the subscription. Subscribing to all topics.
    oThis.processorTopicName = webhookProcessorConstants.processorTopicName(
      oThis.auxChainId,
      queueTopicSuffix,
      oThis.subscribeSubTopic
    );

    // Fetch queue names. subscribing to all topics.
    const processorQueueName = webhookProcessorConstants.processorQueueName(
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
   * Start subscription.
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
    // Const msgParams = messageParams.message.payload;
    // Console.log('-2--msgParams--------', msgParams);
    const publishWebhookResp = await new PublishWebhook({ pendingWebhookId: 1 }).perform();
  }
}

new WebhookPublisherExecutable({ cronProcessId: +program.cronProcessId }).perform();

setInterval(function() {
  logger.info('Ending the process. Sending SIGINT.');
  process.emit('SIGINT');
}, cronProcessesConstants.cronRestartInterval15Mins);
