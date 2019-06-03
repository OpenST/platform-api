/**
 * Module for webhook preprocessor executable.
 *
 * @module executables/webhookPreprocessor
 */

const uuidV4 = require('uuid/v4'),
  program = require('commander');

const rootPrefix = '..',
  RabbitmqSubscription = require(rootPrefix + '/lib/entity/RabbitSubscription'),
  PendingWebhookModel = require(rootPrefix + '/app/models/mysql/PendingWebhook'),
  TokenByTokenIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenByTokenId'),
  MultiSubscriptionBase = require(rootPrefix + '/executables/rabbitmq/MultiSubscriptionBase'),
  WebhookSubscriptionsByClientIdCache = require(rootPrefix +
    '/lib/cacheManagement/kitSaas/WebhookSubscriptionsByClientId'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  rabbitmqProvider = require(rootPrefix + '/lib/providers/rabbitmq'),
  rabbitmqConstants = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  errorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  workflowTopicConstant = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  webhooksDelegatorFactory = require(rootPrefix + '/lib/webhooks/delegator/Factory'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  pendingWebhookConstants = require(rootPrefix + '/lib/globalConstant/pendingWebhook'),
  webhookProcessorConstants = require(rootPrefix + '/lib/globalConstant/webhookProcessor'),
  connectionTimeoutConstants = require(rootPrefix + '/lib/globalConstant/connectionTimeout'),
  webhookPreprocessorConstants = require(rootPrefix + '/lib/globalConstant/webhookPreprocessor'),
  webhookSubscriptionConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/webhookPreprocessor.js --cronProcessId 31');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

/**
 * Class for webhook preprocessor.
 *
 * @class WebhookPreprocessor
 */
class WebhookPreprocessor extends MultiSubscriptionBase {
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
      auxChainId: oThis.chainId
    });
  }

  /**
   * Process message.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _processMessage(messageParams) {
    const oThis = this,
      msgPayload = messageParams.message.payload,
      webhookKind = msgPayload.webhookKind,
      tokenId = msgPayload.tokenId,
      tokenIdToClientIdMap = {};

    let clientId = msgPayload.clientId;

    logger.debug('msgPayload ========', msgPayload);

    // In some cases, we may not have client id so we will fetch it using cache
    // And store it in local memory to reduce cache hits.
    if (!clientId && tokenId && !tokenIdToClientIdMap[tokenId]) {
      const clientIdByTokenCacheRsp = await new TokenByTokenIdCache({ tokenId: tokenId }).fetch();
      tokenIdToClientIdMap[tokenId] = clientIdByTokenCacheRsp.data.clientId;
      clientId = clientIdByTokenCacheRsp.data.clientId;
    } else if (!clientId && tokenId && tokenIdToClientIdMap[tokenId]) {
      clientId = tokenIdToClientIdMap[tokenId];
    }

    msgPayload.topic = messageParams.topics[0];

    const webhookKindInt = webhookSubscriptionConstants.invertedTopics[webhookKind],
      activeWebhookKindsForCurrentClient = await new WebhookSubscriptionsByClientIdCache({
        clientId: clientId
      }).fetch();

    // Send the webhooks only if client has subscribed to particular topic.
    if (activeWebhookKindsForCurrentClient.data[webhookKindInt]) {
      // Call factory and fetch response in entityResponse.
      const entityResponse = await webhooksDelegatorFactory.perform(msgPayload);

      if (entityResponse.isFailure()) {
        return Promise.reject(entityResponse);
      }

      // Create data to insert into pending webhooks.
      const pendingWebhooksParams = {
          clientId: clientId,
          eventUuid: uuidV4(),
          topic: webhookKindInt,
          extraData: JSON.stringify(entityResponse),
          status: pendingWebhookConstants.invertedStatuses[pendingWebhookConstants.queuedStatus]
        },
        pendingWebhooksRsp = await new PendingWebhookModel().insertRecord(pendingWebhooksParams),
        pendingWebhooksId = pendingWebhooksRsp.insertId;

      // Get the id of pending webhooks and insert into respective queue.
      await oThis._insertIntoWebhookProcessor(pendingWebhooksId);
    }
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

  /**
   * This function inserts into webhook processor queue.
   *
   * @param pendingWebhooksId
   * @returns {Promise<void>}
   * @private
   */
  async _insertIntoWebhookProcessor(pendingWebhooksId) {
    const oThis = this,
      rmqConnection = await rabbitmqProvider.getInstance(rabbitmqConstants.auxWebhooksProcessorRabbitmqKind, {
        auxChainId: oThis.chainId,
        connectionWaitSeconds: connectionTimeoutConstants.crons,
        switchConnectionWaitSeconds: connectionTimeoutConstants.switchConnectionCrons
      });

    const messageParams = {
      topics: webhookProcessorConstants.topics,
      publisher: webhookProcessorConstants.publisher,
      message: {
        kind: webhookProcessorConstants.messageKind,
        payload: {
          pendingWebhooksId: pendingWebhooksId
        }
      }
    };

    logger.debug('======= messageParams ========', messageParams);

    const setToRMQ = await rmqConnection.publishEvent.perform(messageParams);

    logger.debug('======= setToRMQ ========', setToRMQ);

    if (setToRMQ.isFailure() || setToRMQ.data.publishedToRmq === 0) {
      logger.error('Could not publish the message to RMQ.');

      const errorObject = responseHelper.error({
        internal_error_identifier: 'send_preprocessor_webhook_failed:e_wp',
        api_error_identifier: 'send_preprocessor_webhook_failed',
        debug_options: { messageParams: messageParams }
      });

      await createErrorLogsEntry.perform(errorObject, errorLogsConstants.mediumSeverity);
    }
  }
}

logger.step('Webhook Preprocessor started.');

new WebhookPreprocessor({ cronProcessId: +program.cronProcessId }).perform();

setInterval(function() {
  logger.info('Ending the process. Sending SIGINT.');
  process.emit('SIGINT');
}, cronProcessesConstants.continuousCronRestartInterval);
