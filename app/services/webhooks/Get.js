'use strict';
/**
 * This service helps in fetching webhook by webhook id(uuid).
 *
 * @module app/services/webhooks/Get
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  WebhookEndpointCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/WebhookEndpoint'),
  WebhookSubscriptionsByUuidCache = require(rootPrefix +
    '/lib/cacheManagement/kitSaasMulti/WebhookSubscriptionsByUuid'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  webhookEndpointConstants = require(rootPrefix + '/lib/globalConstant/webhookEndpoint');

/**
 * Class to get webhook.
 *
 * @class GetWebhook
 */
class GetWebhook extends ServiceBase {
  /**
   * Constructor for get webhook class.
   *
   * @param {Object} params
   * @param {Number} params.client_id
   * @param {String} params.webhook_id - uuid v4
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
   * Async performer method.
   *
   * @return {Promise<void>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateWebhookId();

    await oThis._fetchWebhookSubscriptions();

    return responseHelper.successWithData({
      [resultType.webhook]: {
        id: oThis.webhookId,
        url: oThis.webhookEndpointRsp.endpoint,
        status: oThis.webhookEndpointRsp.status,
        topics: oThis.topics,
        updatedTimestamp: basicHelper.dateToSecondsTimestamp(oThis.webhookEndpointRsp.updatedAt)
      }
    });
  }

  /**
   * Validates webhook id.
   *
   * @returns {Promise<never>}
   * @private
   */
  async _validateWebhookId() {
    const oThis = this,
      webhookEndpointCacheRsp = await new WebhookEndpointCache({ uuid: oThis.webhookId }).fetch();

    oThis.webhookEndpointRsp = webhookEndpointCacheRsp.data;

    // If client id from cache doesn't match or status of webhook id is inactive,
    // then we can say that webhook uuid is invalid.
    if (
      !oThis.webhookEndpointRsp ||
      !oThis.webhookEndpointRsp.uuid ||
      oThis.webhookEndpointRsp.status ===
        webhookEndpointConstants.invertedStatuses[webhookEndpointConstants.inActive] ||
      oThis.webhookEndpointRsp.clientId !== oThis.clientId
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_w_g_1',
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
  async _fetchWebhookSubscriptions() {
    const oThis = this,
      webhookSubscriptionCacheRsp = await new WebhookSubscriptionsByUuidCache({
        webhookEndpointUuids: [oThis.webhookId]
      }).fetch(),
      webhookSubscriptionCacheRspData = webhookSubscriptionCacheRsp.data[oThis.webhookId],
      activeWebhooks = webhookSubscriptionCacheRspData.active;

    for (let i = 0; i < activeWebhooks.length; i++) {
      oThis.topics.push(activeWebhooks[i].topic);
    }
  }
}

InstanceComposer.registerAsShadowableClass(GetWebhook, coreConstants.icNameSpace, 'GetWebhook');

module.exports = {};
