/**
 * Module for publish to processor executable.
 *
 * @module lib/webhooks/PublishToProcessor
 */

const uuidV4 = require('uuid/v4');

const rootPrefix = '../..',
  WebhookQueueModel = require(rootPrefix + '/app/models/mysql/WebhookQueue'),
  PendingWebhookModel = require(rootPrefix + '/app/models/mysql/PendingWebhook'),
  TokenByTokenIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenByTokenId'),
  PendingWebhooksCache = require(rootPrefix + '/lib/cacheManagement/shared/PendingWebhooks'),
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
  pendingWebhookConstants = require(rootPrefix + '/lib/globalConstant/pendingWebhook'),
  webhookProcessorConstants = require(rootPrefix + '/lib/globalConstant/webhookProcessor'),
  connectionTimeoutConstants = require(rootPrefix + '/lib/globalConstant/connectionTimeout'),
  webhookSubscriptionConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

/**
 * Class for PublishToProcessor
 *
 * @class PublishToProcessor
 */
class PublishToProcessor {
  /**
   * Constructor for PublishToProcessor.
   *
   * @param {object} params: params object
   * @param {object} params.messageParams: message params.
   * @param {number} params.chainId: chain id.
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.messageParams = params.messageParams;
    oThis.chainId = params.chainId;

    oThis.webhookQueues = [];
    oThis.msgPayload = null;
  }

  /**
   * Main performer method.
   *
   * @returns {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis._getDataFromPayload();

    await oThis._sendIfSubscribed();
  }

  /**
   * Get data from payload.
   *
   * @sets oThis.msgPayload
   *
   * @returns {Promise<*>}
   * @private
   */
  async _getDataFromPayload() {
    const oThis = this;

    oThis.msgPayload = oThis.messageParams.message.payload;
    oThis.msgPayload.topic = oThis.messageParams.topics[0];

    const tokenId = oThis.msgPayload.tokenId,
      tokenIdToClientIdMap = {};

    let clientId = oThis.msgPayload.clientId;

    // In some cases, we may not have client id so we will fetch it using cache
    // And store it in local memory to reduce cache hits.
    if (!clientId && tokenId && !tokenIdToClientIdMap[tokenId]) {
      const clientIdByTokenCacheRsp = await new TokenByTokenIdCache({ tokenId: tokenId }).fetch();

      tokenIdToClientIdMap[tokenId] = clientIdByTokenCacheRsp.data.clientId;
      clientId = clientIdByTokenCacheRsp.data.clientId;
    } else if (!clientId && tokenId && tokenIdToClientIdMap[tokenId]) {
      clientId = tokenIdToClientIdMap[tokenId];
    }

    oThis.msgPayload.clientId = clientId;
  }

  /**
   * Send webhooks if client has subscribed.
   *
   * @returns {Promise<never>}
   * @private
   */
  async _sendIfSubscribed() {
    const oThis = this;

    const clientId = oThis.msgPayload.clientId,
      webhookKind = oThis.msgPayload.webhookKind,
      webhookKindInt = webhookSubscriptionConstants.invertedTopics[webhookKind],
      activeWebhookKindsForCurrentClient = await new WebhookSubscriptionsByClientIdCache({
        clientId: clientId
      }).fetch();

    // Send the webhooks only if client has subscribed to particular topic.
    if (activeWebhookKindsForCurrentClient.data[webhookKindInt]) {
      // Call webhooks delegator factory and fetch response in entityResponse.
      const entityResponse = await webhooksDelegatorFactory.perform(oThis.msgPayload);

      if (entityResponse.isFailure()) {
        return Promise.reject(entityResponse);
      }

      // Create data to insert into pending webhooks.
      const extraData = JSON.stringify({
        webhookEndpointUuid: activeWebhookKindsForCurrentClient.data[webhookKindInt],
        entityResultType: entityResponse.data.entityResultType,
        rawEntity: entityResponse.data.rawEntity
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
      const insertResponse = await new PendingWebhookModel().insertRecord(pendingWebhooksParams);

      const pendingWebhookId = insertResponse.pendingWebhooksId,
        cacheParams = insertResponse.cacheParams;

      const pendingWebhooksCache = new PendingWebhooksCache({
        pendingWebhookId: pendingWebhookId
      });

      // Set pending webhooks cache.
      await pendingWebhooksCache._setCache(cacheParams);

      // Get the id of pending webhooks and insert into respective queue.
      await oThis._publishToWebhookProcessor(pendingWebhookId, webhookSubTopic);
    }
  }

  /**
   * This function inserts into webhook processor queue.
   *
   * @param {number/string} pendingWebhookId
   * @param {string} subTopic
   *
   * @returns {Promise<void>}
   * @private
   */
  async _publishToWebhookProcessor(pendingWebhookId, subTopic) {
    const oThis = this;

    const rmqConnection = await rabbitmqProvider.getInstance(rabbitmqConstants.auxWebhooksProcessorRabbitmqKind, {
      auxChainId: oThis.chainId,
      connectionWaitSeconds: connectionTimeoutConstants.crons,
      switchConnectionWaitSeconds: connectionTimeoutConstants.switchConnectionCrons
    });

    logger.debug('oThis.webhookQueues.length in _publishToWebhookProcessor', oThis.webhookQueues);

    if (oThis.webhookQueues.length === 0) {
      await oThis._getActiveWebhookQueues();
    }

    const queueTopics = basicHelper.shuffleArray(oThis.webhookQueues),
      topicName = webhookProcessorConstants.processorTopicName(oThis.chainId, queueTopics[0], subTopic),
      messageParams = {
        topics: [topicName],
        publisher: webhookProcessorConstants.publisher,
        message: {
          kind: webhookProcessorConstants.messageKind,
          payload: {
            pendingWebhookId: pendingWebhookId
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
        chain_id: oThis.chainId,
        status: webhookQueueConstants.invertedStatuses[webhookQueueConstants.activeStatus]
      })
      .fire();

    for (let index = 0; index < webhookQueues.length; index++) {
      oThis.webhookQueues.push(webhookQueues[index].queue_topic_suffix);
    }

    logger.debug(' oThis.webhookQueues ===== in _getActiveWebhookQueues', oThis.webhookQueues);
  }
}

module.exports = PublishToProcessor;
