/**
 * Module for webhook preprocessor executable.
 *
 * @module executables/PreProcessor
 */

const program = require('commander');

const rootPrefix = '../..',
  PublishToProcessor = require(rootPrefix + '/lib/webhooks/PublishToProcessor'),
  RabbitmqSubscription = require(rootPrefix + '/lib/entity/RabbitSubscription'),
  MultiSubscriptionBase = require(rootPrefix + '/executables/rabbitmq/MultiSubscriptionBase'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  rabbitmqConstants = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  webhookPreprocessorConstants = require(rootPrefix + '/lib/globalConstant/webhookPreprocessor');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/webhook/preProcessor.js --cronProcessId 31');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

/**
 * Class for Webhook PreProcessor.
 *
 * @class WebhookPreProcessor
 */
class WebhookPreProcessor extends MultiSubscriptionBase {
  /**
   * Constructor for webhook preprocessor.
   *
   * @param {object} params: params object
   * @param {number} params.cronProcessId: cron_processes table id
   *
   * @augments MultiSubscriptionBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);
  }

  /**
   * Get process name prefix.
   *
   * @returns {string}
   * @private
   */
  get _processNamePrefix() {
    return 'pre_webhook_processor';
  }

  /**
   * Get topics to subscribe.
   *
   * @returns {*[]}
   * @private
   */
  get _topicsToSubscribe() {
    return webhookPreprocessorConstants.topics;
  }

  /**
   * Get queue name.
   *
   * @returns {string}
   * @private
   */
  get _queueName() {
    return 'webhook_preprocessor';
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
   * Get cron kind.
   *
   * @returns {string}
   * @private
   */
  get _cronKind() {
    return cronProcessesConstants.webhookPreprocessor;
  }

  /**
   * Steps to do before subscribe.
   *
   * @return {Promise<boolean>}
   * @private
   */
  async _beforeSubscribe() {
    return true;
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
      rabbitmqKind: rabbitmqConstants.auxWebhooksPreprocessorRabbitmqKind,
      topic: oThis._topicsToSubscribe[0],
      queue: oThis._queueName,
      prefetchCount: oThis.prefetchCount,
      auxChainId: oThis.auxChainId
    });
  }

  /**
   * Process message.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _processMessage(messageParams) {
    const oThis = this;

    await new PublishToProcessor({
      messageParams: messageParams,
      chainId: oThis.auxChainId
    }).perform();
  }

  /**
   * Start subscription.
   *
   * @return {Promise<*>}
   * @private
   */
  async _startSubscription() {
    const oThis = this;

    await oThis._startSubscriptionFor(oThis._topicsToSubscribe[0]);
  }
}

logger.step('Webhook Preprocessor started.');

new WebhookPreProcessor({ cronProcessId: +program.cronProcessId }).perform();

setInterval(function() {
  logger.info('Ending the process. Sending SIGINT.');
  process.emit('SIGINT');
}, cronProcessesConstants.continuousCronRestartInterval);
