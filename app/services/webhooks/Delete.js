'use strict';
/**
 * This service helps in deleting webhook.
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
   * Constructor foe delete webhook class.
   *
   * @param params
   * @param params.client_id
   * @param params.webhook_id
   *
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.webhookId = params.webhook_id;

    oThis.webhooksEndpointId = null;
    oThis.topics = [];
  }

  /**
   * Async performer method.
   *
   * @return {Promise<void>}
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
        endpoint: oThis.webhookEndpointRsp.endpoint,
        status: webhookEndpointConstants.inActive,
        updatedAt: oThis.webhookEndpointRsp.updatedAt,
        id: oThis.webhookId,
        topics: oThis.topics
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
    if (!oThis.webhookEndpointRsp || !oThis.webhookEndpointRsp.uuid) {
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
   * @private
   */
  async _prepareResponseData() {
    const oThis = this,
      webhookSubscriptionCacheRsp = await new WebhookSubscriptionsByUuidCache({
        webhookEndpointUuids: [oThis.webhookId]
      }).fetch(),
      webhookSubscriptionCacheRspData = webhookSubscriptionCacheRsp.data[oThis.webhookId],
      activeWebhooks = webhookSubscriptionCacheRspData.active;

    console.log('webhookSubscriptionCacheRsp ==========', webhookSubscriptionCacheRsp);

    for (let i = 0; i < activeWebhooks.length; i++) {
      oThis.topics.push(activeWebhooks[i].topic);
    }

    console.log('activeWebhooks ==========', activeWebhooks);
  }

  /**
   * Mark webhook subscriptions inactive.
   *
   * @returns {Promise<never>}
   * @private
   */
  async _markWebhookSubscriptionsInactive() {
    const oThis = this,
      webhookSubscriptionRsp = await new WebhookSubscriptionModel()
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
    const oThis = this,
      webhookEndpointRsp = await new WebhookEndpointModel()
        .update({
          status: webhookEndpointConstants.invertedStatuses[webhookEndpointConstants.inActiveStatus]
        })
        .where({
          uuid: oThis.webhookId
        })
        .fire();
  }

  async _clearCache() {
    const oThis = this;
    await new WebhookSubscriptionsByUuidCache({ webhookEndpointUuids: [oThis.webhookId] }).clear();
  }
}

InstanceComposer.registerAsShadowableClass(DeleteWebhook, coreConstants.icNameSpace, 'DeleteWebhook');

module.exports = {};
