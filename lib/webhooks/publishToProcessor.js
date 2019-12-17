/**
 * Module for publish to processor executable.
 *
 * @module lib/webhooks/publishToProcessor
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
   * @constructor
   */
  constructor() {
    const oThis = this;

    oThis.webhookQueues = [];
  }

  /**
   * Main performer method.
   *
   * @param {object} messageParams: message params.
   * @param {number} chainId: chain id.
   *
   * @returns {Promise<void>}
   */
  async perform(messageParams, chainId) {
    const oThis = this;

    const msgPayload = await oThis._getDataFromPayload(messageParams, chainId);

    await oThis._sendIfSubscribed(msgPayload, chainId);
  }

  /**
   * Get data from payload.
   *
   * @param {object} messageParams: message params
   * @param {Integer} chainId
   *
   * @sets msgPayload
   *
   * @returns {Promise<*>}
   * @private
   */
  async _getDataFromPayload(messageParams, chainId) {
    const msgPayload = messageParams.message.payload;
    msgPayload.topic = messageParams.topics[0];

    const tokenId = msgPayload.tokenId,
      tokenIdToClientIdMap = {};

    let clientId = msgPayload.clientId;

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
    msgPayload.chainId = chainId;

    return msgPayload;
  }

  /**
   * Send webhooks if client has subscribed.
   *
   * @param {object} msgPayload: message payload.
   * @param {number} chainId: chain id
   *
   * @returns {Promise<never>}
   * @private
   */
  async _sendIfSubscribed(msgPayload, chainId) {
    const oThis = this;

    let enqueueForPublish = true;
    const clientId = msgPayload.clientId,
      webhookKind = msgPayload.webhookKind,
      webhookKindInt = webhookSubscriptionConstants.invertedTopics[webhookKind],
      activeWebhookKindsForCurrentClient = await new WebhookSubscriptionsByClientIdCache({
        clientId: clientId
      }).fetch();

    logger.debug(' ====== msgPayload', msgPayload);

    // Send the webhooks only if client has subscribed to particular topic.
    if (activeWebhookKindsForCurrentClient.data[webhookKindInt]) {
      // Call webhooks delegator factory and fetch response in entityResponse.
      const entityResponse = await webhooksDelegatorFactory.perform(msgPayload);

      // Create data to insert into pending webhooks.
      let pendingWebhookId = msgPayload.pendingWebhookId || null,
        pendingWebhooksParams = {
          clientId: clientId,
          eventUuid: uuidV4(),
          webhookTopicKind: webhookKindInt,
          status: pendingWebhookConstants.invertedStatuses[pendingWebhookConstants.queuedStatus]
        };
      if (entityResponse.isFailure()) {
        // Entity data is not built properly. So no need to enqueue it for processing.
        enqueueForPublish = false;
        pendingWebhooksParams.extraData = JSON.stringify({
          webhookEndpointUuid: activeWebhookKindsForCurrentClient.data[webhookKindInt],
          payload: msgPayload
        });
        pendingWebhooksParams.status =
          pendingWebhookConstants.invertedStatuses[pendingWebhookConstants.dataBuildingFailedStatus];
        pendingWebhooksParams.nextRetryAt = Math.floor(Date.now() / 1000) + 5;
      } else {
        pendingWebhooksParams.extraData = JSON.stringify({
          webhookEndpointUuid: activeWebhookKindsForCurrentClient.data[webhookKindInt],
          entityResultType: entityResponse.data.entityResultType,
          rawEntity: entityResponse.data.rawEntity
        });
      }

      pendingWebhookId = await oThis._insertUpdatePendingWebhook(
        pendingWebhooksParams,
        pendingWebhookId,
        entityResponse
      );

      // Get the id of pending webhooks and insert into respective queue.
      if (enqueueForPublish) {
        const webhookSubTopic = webhookSubscriptionConstants.webhookQueueTopicName[webhookKind];
        await oThis._publishToWebhookProcessor(pendingWebhookId, webhookSubTopic, chainId);
      }
    }
  }

  /**
   * Add or update record in pending webhook
   *
   * @param pendingWebhooksParams
   * @param pendingWebhookId
   * @returns {Promise<any.insertId>}
   * @private
   */
  async _insertUpdatePendingWebhook(pendingWebhooksParams, pendingWebhookId, entityResponse) {
    const oThis = this;

    // If webhook id is already present, then it would be updated.
    if (pendingWebhookId) {
      const cacheObj = new PendingWebhooksCache({ pendingWebhookId: pendingWebhookId }),
        cacheResp = await cacheObj.fetch();
      if (
        cacheResp.isSuccess() &&
        cacheResp.data.retryCount > pendingWebhookConstants.maxDataBuildingFailedRetryCount
      ) {
        const errorObject = responseHelper.error({
          internal_error_identifier: 'send_preprocessor_webhook_failed:e_wpp_2',
          api_error_identifier: 'send_preprocessor_webhook_failed',
          debug_options: {
            messageParams: 'Failed to build data for sending webhook id: ' + pendingWebhookId,
            entityResponse: entityResponse
          }
        });

        pendingWebhooksParams.status =
          pendingWebhookConstants.invertedStatuses[pendingWebhookConstants.completelyFailedStatus];
        await createErrorLogsEntry.perform(errorObject, errorLogsConstants.mediumSeverity);
      }

      await new PendingWebhookModel()
        .update([
          'extra_data = ?, status = ?, next_retry_at = ?, retry_count = retry_count + 1',
          pendingWebhooksParams.extraData,
          pendingWebhooksParams.status,
          pendingWebhooksParams.nextRetryAt
        ])
        .where({ id: pendingWebhookId })
        .fire();

      // Clear old pending webhooks cache.
      await cacheObj.clear();
    } else {
      // Insert into pending webooks table.
      const insertResponse = await new PendingWebhookModel().insertRecord(pendingWebhooksParams),
        cacheParams = insertResponse.cacheParams;

      pendingWebhookId = insertResponse.pendingWebhooksId;

      // Set pending webhooks cache.
      await new PendingWebhooksCache({ pendingWebhookId: pendingWebhookId })._setCache(cacheParams);
    }

    return pendingWebhookId;
  }

  /**
   * This function inserts into webhook processor queue.
   *
   * @param {number/string} pendingWebhookId
   * @param {string} subTopic
   * @param {number} chainId
   *
   * @returns {Promise<void>}
   * @private
   */
  async _publishToWebhookProcessor(pendingWebhookId, subTopic, chainId) {
    const oThis = this;

    const rmqConnection = await rabbitmqProvider.getInstance(rabbitmqConstants.auxWebhooksProcessorRabbitmqKind, {
      auxChainId: chainId,
      connectionWaitSeconds: connectionTimeoutConstants.crons,
      switchConnectionWaitSeconds: connectionTimeoutConstants.switchConnectionCrons
    });

    logger.debug('oThis.webhookQueues.length in _publishToWebhookProcessor', oThis.webhookQueues);

    if (oThis.webhookQueues.length === 0) {
      await oThis._getActiveWebhookQueues(chainId);
    }

    const queueTopics = basicHelper.shuffleArray(oThis.webhookQueues),
      topicName = webhookProcessorConstants.processorTopicName(chainId, queueTopics[0], subTopic),
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
  async _getActiveWebhookQueues(chainId) {
    const oThis = this;

    const webhookQueues = await new WebhookQueueModel()
      .select('queue_topic_suffix')
      .where({
        chain_id: chainId,
        status: webhookQueueConstants.invertedStatuses[webhookQueueConstants.activeStatus]
      })
      .fire();

    for (let index = 0; index < webhookQueues.length; index++) {
      oThis.webhookQueues.push(webhookQueues[index].queue_topic_suffix);
    }

    logger.debug(' oThis.webhookQueues ===== in _getActiveWebhookQueues', oThis.webhookQueues);
  }
}

module.exports = new PublishToProcessor();
