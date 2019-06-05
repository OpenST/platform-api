/**
 * Module for webhook preprocessor executable.
 *
 * @module executables/webhookPreprocessor
 */

const uuidV4 = require('uuid/v4'),
  program = require('commander');

const rootPrefix = '..',
  WebhookQueueModel = require(rootPrefix + '/app/models/mysql/WebhookQueue'),
  RabbitmqSubscription = require(rootPrefix + '/lib/entity/RabbitSubscription'),
  PendingWebhookModel = require(rootPrefix + '/app/models/mysql/PendingWebhook'),
  TokenByTokenIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenByTokenId'),
  MultiSubscriptionBase = require(rootPrefix + '/executables/rabbitmq/MultiSubscriptionBase'),
  WebhookSubscriptionsByClientIdCache = require(rootPrefix +
    '/lib/cacheManagement/kitSaas/WebhookSubscriptionsByClientId'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  rabbitmqProvider = require(rootPrefix + '/lib/providers/rabbitmq'),
  rabbitmqConstants = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  errorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  webhookQueueConstants = require(rootPrefix + '/lib/globalConstant/webhookQueue'),
  webhooksDelegatorFactory = require(rootPrefix + '/lib/webhooks/delegator/factory'),
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

    const oThis = this;

    oThis.webhookQueues = [];
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

    msgPayload.clientId = clientId;

    msgPayload.topic = messageParams.topics[0];

    const webhookKindInt = webhookSubscriptionConstants.invertedTopics[webhookKind],
      activeWebhookKindsForCurrentClient = await new WebhookSubscriptionsByClientIdCache({
        clientId: clientId
      }).fetch();

    // Send the webhooks only if client has subscribed to particular topic.
    if (activeWebhookKindsForCurrentClient.data[webhookKindInt]) {
      // Call webhooks delegator factory and fetch response in entityResponse.
      const entityResponse = await webhooksDelegatorFactory.perform(msgPayload);

      if (entityResponse.isFailure()) {
        return Promise.reject(entityResponse);
      }

      // Create data to insert into pending webhooks.
      const extraData = JSON.stringify({
        webhookEndpointUuid: activeWebhookKindsForCurrentClient.data[webhookKindInt],
        rawEntity: entityResponse
      });

      const pendingWebhooksParams = {
          clientId: clientId,
          eventUuid: uuidV4(),
          webhookTopicKind: webhookKindInt,
          extraData: extraData,
          status: pendingWebhookConstants.invertedStatuses[pendingWebhookConstants.queuedStatus]
        },
        webhookSubTopic = webhookSubscriptionConstants.webhookQueueTopicName[webhookKind];

      // Insert into pending webooks table.
      const pendingWebhooksId = await new PendingWebhookModel().insertRecord(pendingWebhooksParams);

      // Get the id of pending webhooks and insert into respective queue.
      await oThis._publishToWebhookProcessor(pendingWebhooksId, webhookSubTopic);
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
   * Get active webhook queues.
   *
   * @sets oThis.webhookQueues
   *
   * @returns {Promise<void>}
   * @private
   */
  async _getActiveWebhookQueues() {
    const oThis = this;

    const webhookQueues = await new WebhookQueueModel()
      .select('queue_topic_suffix')
      .where({
        chain_id: oThis.auxChainId,
        status: webhookQueueConstants.invertedStatuses[webhookQueueConstants.activeStatus]
      })
      .fire();

    for (let index = 0; index < webhookQueues.length; index++) {
      oThis.webhookQueues.push(webhookQueues[index].queue_topic_suffix);
    }
  }

  /**
   * This function inserts into webhook processor queue.
   *
   * @param {number/string} pendingWebhooksId
   * @param {string} subTopic
   *
   * @returns {Promise<void>}
   * @private
   */
  async _publishToWebhookProcessor(pendingWebhooksId, subTopic) {
    const oThis = this;

    const rmqConnection = await rabbitmqProvider.getInstance(rabbitmqConstants.auxWebhooksProcessorRabbitmqKind, {
      auxChainId: oThis.auxChainId,
      connectionWaitSeconds: connectionTimeoutConstants.crons,
      switchConnectionWaitSeconds: connectionTimeoutConstants.switchConnectionCrons
    });

    if (oThis.webhookQueues.length === 0) {
      await oThis._getActiveWebhookQueues();
    }

    const queueTopics = basicHelper.shuffleArray(oThis.webhookQueues),
      topicName = webhookProcessorConstants.processorTopicName(oThis.auxChainId, queueTopics[0], subTopic),
      messageParams = {
        topics: [topicName],
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

    if (setToRMQ.isFailure() || setToRMQ.data.publishedToRmq === 0) {
      logger.error('Could not publish the message to RMQ.');

      const errorObject = responseHelper.error({
        internal_error_identifier: 'send_preprocessor_webhook_failed:e_wpp_1',
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
