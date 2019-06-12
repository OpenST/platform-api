/**
 * Module to get all webhooks.
 *
 * @module app/services/webhooks/Get
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  WebhookEndpointCacheByClientId = require(rootPrefix + '/lib/cacheManagement/kitSaas/WebhookEndpointByClientId'),
  WebhookSubscriptionsByUuidCache = require(rootPrefix +
    '/lib/cacheManagement/kitSaasMulti/WebhookSubscriptionsByUuid'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  pagination = require(rootPrefix + '/lib/globalConstant/pagination'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  webhookEndpointConstants = require(rootPrefix + '/lib/globalConstant/webhookEndpoints');

/**
 * Class to get all webhooks.
 *
 * @class GetAllWebhook
 */
class GetAllWebhook extends ServiceBase {
  /**
   * Constructor to get all webhooks.
   *
   * @param {object} params
   * @param {number} params.client_id
   * @param {number} [params.limit]: limit
   * @param {string} [params.pagination_identifier]: pagination identifier
   *
   * @augments ServiceBase
   *
   * @constructor
   */
  constructor(params) {
    super();

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.limit = params.limit || oThis._defaultPageLimit();
    oThis.paginationIdentifier = params[pagination.paginationIdentifierKey] || null;

    oThis.webhookEndpoints = [];
    oThis.webhookIds = [];
    oThis.responseMetaData = {
      [pagination.nextPagePayloadKey]: {}
    };
  }

  /**
   * Async perform.
   *
   * @return {Promise}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateAndSanitizeParams();

    await oThis._getWebhookEndpoints();

    await oThis._fetchWebhookSubscriptions();

    await oThis._setMeta();

    return responseHelper.successWithData({
      [resultType.webhook]: oThis.webhookEndpoints,
      [resultType.meta]: oThis.responseMetaData
    });
  }

  /**
   * Validate and sanitize specific params.
   *
   * @sets oThis.page
   *
   * @returns {Promise<never>}
   * @private
   */
  async _validateAndSanitizeParams() {
    const oThis = this;

    // Parameters in paginationIdentifier take higher precedence
    if (oThis.paginationIdentifier) {
      const parsedPaginationParams = oThis._parsePaginationParams(oThis.paginationIdentifier);

      oThis.page = parsedPaginationParams.page; // Override page
    } else {
      oThis.page = 1;
    }

    // Validate limit
    return oThis._validatePageSize();
  }

  /**
   * Validates webhook id.
   *
   * @returns {Promise<never>}
   * @private
   */
  async _getWebhookEndpoints() {
    const oThis = this;

    const webhookEndpointCacheRsp = await new WebhookEndpointCacheByClientId({
        clientId: oThis.clientId,
        limit: oThis.limit,
        page: oThis.page
      }).fetch(),
      webhookEndpointsData = webhookEndpointCacheRsp.data;

    oThis.webhookIds.push(uuid);
    oThis.webhookEndpoints.push(webhookEndpointsData[uuid]);
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
        webhookEndpointUuids: oThis.webhookIds
      }).fetch(),
      webhookSubscriptionCacheRspData = webhookSubscriptionCacheRsp.data;

    for (let index = 0; index < oThis.webhookEndpoints.length; index++) {
      const webhookEndpoint = oThis.webhookEndpoints[index],
        activeTopicList = webhookSubscriptionCacheRspData[webhookEndpoint.id].active;

      webhookEndpoint.topics = [];

      for (let activeTopicsIndex = 0; activeTopicsIndex < activeTopicList.length; activeTopicsIndex++) {
        webhookEndpoint.topics.push(activeTopicList[activeTopicsIndex].webhookTopicKind);
      }
    }
  }

  /**
   * Set meta property.
   *
   * @private
   */
  _setMeta() {
    const oThis = this;

    if (oThis.webhookEndpoints.length >= oThis.limit) {
      oThis.responseMetaData[pagination.nextPagePayloadKey] = {
        [pagination.paginationIdentifierKey]: {
          page: oThis.page + 1,
          limit: oThis.limit
        }
      };
    }
  }

  /**
   * Default page limit.
   *
   * @private
   */
  _defaultPageLimit() {
    return pagination.defaultWebhookListPageSize;
  }

  /**
   * Minimum page limit.
   *
   * @private
   */
  _minPageLimit() {
    return pagination.minWebhookListPageSize;
  }

  /**
   * Maximum page limit.
   *
   * @private
   */
  _maxPageLimit() {
    return pagination.maxWebhookListPageSize;
  }

  /**
   * Current page limit.
   *
   * @private
   */
  _currentPageLimit() {
    const oThis = this;

    return oThis.limit;
  }
}

InstanceComposer.registerAsShadowableClass(GetAllWebhook, coreConstants.icNameSpace, 'GetAllWebhook');

module.exports = {};
