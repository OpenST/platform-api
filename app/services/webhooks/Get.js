/**
 * Module to fetch webhook by webhook id(uuid).
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
  webhookEndpointsConstants = require(rootPrefix + '/lib/globalConstant/webhookEndpoints');

/**
 * Class to fetch webhook by webhook id(uuid).
 *
 * @class GetWebhook
 */
class GetWebhook extends ServiceBase {
  /**
   * Constructor to fetch webhook by webhook id(uuid).
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
    super();

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
   * @sets oThis.webhookEndpointRsp
   *
   * @returns {Promise<never>}
   * @private
   */
  async _validateWebhookId() {
    const oThis = this;

    const webhookEndpointCacheRsp = await new WebhookEndpointCache({ uuid: oThis.webhookId }).fetch();

    oThis.webhookEndpointRsp = webhookEndpointCacheRsp.data;

    // If client id from cache doesn't match or status of webhook id is inactive,
    // Then we can say that webhook uuid is invalid.
    if (
      !oThis.webhookEndpointRsp ||
      !oThis.webhookEndpointRsp.uuid ||
      oThis.webhookEndpointRsp.status ===
        webhookEndpointsConstants.invertedStatuses[webhookEndpointsConstants.inActiveStatus] ||
      oThis.webhookEndpointRsp.clientId !== oThis.clientId
    ) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_w_g_1',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_webhook_id'],
          debug_options: {}
        })
      );
    }
  }

  /**
   * Fetch webhook subscriptions.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchWebhookSubscriptions() {
    const oThis = this;

    const webhookSubscriptionCacheRsp = await new WebhookSubscriptionsByUuidCache({
        webhookEndpointUuids: [oThis.webhookId]
      }).fetch(),
      webhookSubscriptionCacheRspData = webhookSubscriptionCacheRsp.data[oThis.webhookId],
      activeWebhooks = webhookSubscriptionCacheRspData.active;

    for (let index = 0; index < activeWebhooks.length; index++) {
      oThis.topics.push(activeWebhooks[index].webhookTopicKind);
    }
  }
}

InstanceComposer.registerAsShadowableClass(GetWebhook, coreConstants.icNameSpace, 'GetWebhook');

module.exports = {};
