/**
 * Module to delete webhook.
 *
 * @module app/services/webhooks/Delete
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  WebhookEndpointModel = require(rootPrefix + '/app/models/mysql/WebhookEndpoint'),
  WebhookSubscriptionModel = require(rootPrefix + '/app/models/mysql/WebhookSubscription'),
  WebhookEndpointCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/WebhookEndpoint'),
  WebhookSubscriptionsByUuidCache = require(rootPrefix +
    '/lib/cacheManagement/kitSaasMulti/WebhookSubscriptionsByUuid'),
  WebhookEndpointCacheByClientId = require(rootPrefix + '/lib/cacheManagement/kitSaas/WebhookEndpointByClientId'),
  WebhookSubscriptionsByClientIdCache = require(rootPrefix +
    '/lib/cacheManagement/kitSaas/WebhookSubscriptionsByClientId'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  webhookEndpointConstants = require(rootPrefix + '/lib/globalConstant/webhookEndpoint'),
  webhookSubscriptionConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

/**
 * Class to delete webhook.
 *
 * @class DeleteWebhook
 */
class DeleteWebhook extends ServiceBase {
  /**
   * Constructor for delete webhook class.
   *
   * @param {object} params
   * @param {number} params.client_id
   * @param {string} params.webhook_id: uuid v4
   *
   * @augments ServiceBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.webhookId = params.webhook_id;

    oThis.topics = [];
  }

  /**
   * Async perform.
   *
   * @return {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateWebhookId();

    await oThis._prepareResponseData();

    await oThis._markWebhookSubscriptionsInactive();

    await oThis._markWebhookEndpointsInactive();

    await oThis._clearCache();

    return responseHelper.successWithData({
      [resultType.webhook]: {
        id: oThis.webhookId,
        url: oThis.webhookEndpointRsp.endpoint,
        status: webhookEndpointConstants.inActive,
        topics: oThis.topics,
        updatedTimestamp: basicHelper.dateToSecondsTimestamp(oThis.webhookEndpointRsp.updatedAt)
      }
    });
  }

  /**
   * Validates webhookId.
   *
   * @returns {Promise<never>}
   * @private
   */
  async _validateWebhookId() {
    const oThis = this,
      webhookEndpointCacheRsp = await new WebhookEndpointCache({ uuid: oThis.webhookId }).fetch();

    oThis.webhookEndpointRsp = webhookEndpointCacheRsp.data;

    // If client id from cache doesn't match or status of webhook id is inactive,
    // Then we can say that webhook uuid is invalid.
    if (
      !oThis.webhookEndpointRsp ||
      !oThis.webhookEndpointRsp.uuid ||
      oThis.webhookEndpointRsp.clientId !== oThis.clientId ||
      oThis.webhookEndpointRsp.status == webhookEndpointConstants.invertedStatuses[webhookEndpointConstants.inActive] ||
      oThis.webhookEndpointRsp.clientId !== oThis.clientId
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_w_d_1',
          api_error_identifier: 'invalid_webhook_uuid',
          debug_options: {}
        })
      );
    }
  }

  /**
   * Prepare response to return.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _prepareResponseData() {
    const oThis = this,
      webhookSubscriptionCacheRsp = await new WebhookSubscriptionsByUuidCache({
        webhookEndpointUuids: [oThis.webhookId]
      }).fetch(),
      webhookSubscriptionCacheRspData = webhookSubscriptionCacheRsp.data[oThis.webhookId],
      activeWebhooks = webhookSubscriptionCacheRspData.active;

    for (let index = 0; index < activeWebhooks.length; index++) {
      oThis.topics.push(activeWebhooks[index].webhook_topic_kind);
    }
  }

  /**
   * Mark webhook subscriptions inactive.
   *
   * @returns {Promise<never>}
   * @private
   */
  async _markWebhookSubscriptionsInactive() {
    const oThis = this;

    await new WebhookSubscriptionModel()
      .update({
        status: webhookSubscriptionConstants.invertedStatuses[webhookSubscriptionConstants.inActiveStatus]
      })
      .where({
        webhook_endpoint_uuid: oThis.webhookId
      })
      .fire();
  }

  /**
   * Mark webhook endpoints inactive.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _markWebhookEndpointsInactive() {
    const oThis = this;

    await new WebhookEndpointModel()
      .update({
        status: webhookEndpointConstants.invertedStatuses[webhookEndpointConstants.inActive]
      })
      .where({
        uuid: oThis.webhookId
      })
      .fire();
  }

  /**
   * Clear cache.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _clearCache() {
    const oThis = this;

    // Clear webhook subscriptions cache.
    await new WebhookSubscriptionsByUuidCache({ webhookEndpointUuids: [oThis.webhookId] }).clear();

    // Clear webhook endpoints cache.
    await new WebhookEndpointCache({ uuid: oThis.webhookId }).clear();
    await new WebhookEndpointCacheByClientId({ clientId: oThis.clientId }).clear();
    await new WebhookSubscriptionsByClientIdCache({ clientId: oThis.clientId }).clear();
  }
}

InstanceComposer.registerAsShadowableClass(DeleteWebhook, coreConstants.icNameSpace, 'DeleteWebhook');

module.exports = {};
