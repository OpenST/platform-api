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
  WebhookEndpointCacheByClientId = require(rootPrefix + '/lib/cacheManagement/kitSaas/WebhookEndpointByClientId'),
  WebhookSubscriptionsByUuidCache = require(rootPrefix +
    '/lib/cacheManagement/kitSaasMulti/WebhookSubscriptionsByUuid'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  pagination = require(rootPrefix + '/lib/globalConstant/pagination'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  webhookSubscriptionConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

/**
 * Class to get webhook.
 *
 * @class GetAllWebhook
 */
class GetAllWebhook extends ServiceBase {
  /**
   * Constructor for get webhook class.
   *
   * @param {Object} params
   * @param {Number} params.client_id
   * @param {Integer} params.limit - limit
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.limit = params.limit || oThis._defaultPageLimit();
    oThis.paginationIdentifier = params[pagination.paginationIdentifierKey];

    oThis.webhookEndpoints = [];
    oThis.webhookIds = [];
    oThis.responseMetaData = {
      [pagination.nextPagePayloadKey]: {}
    };
  }

  /**
   * Async performer method.
   *
   * @return {Promise}
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
   * Validate and sanitize specific params
   *
   * @returns {Promise<never>}
   * @private
   */
  async _validateAndSanitizeParams() {
    const oThis = this;

    // Parameters in paginationIdentifier take higher precedence
    if (oThis.paginationIdentifier) {
      let parsedPaginationParams = oThis._parsePaginationParams(oThis.paginationIdentifier);
      oThis.page = parsedPaginationParams.page; //override page
    } else {
      oThis.page = 1;
    }

    //Validate limit
    return await oThis._validatePageSize();
  }

  /**
   * Validates webhook id.
   *
   * @returns {Promise<never>}
   * @private
   */
  async _getWebhookEndpoints() {
    const oThis = this,
      webhookEndpointCacheRsp = await new WebhookEndpointCacheByClientId({
        clientId: oThis.clientId,
        limit: oThis.limit,
        page: oThis.page
      }).fetch(),
      webhookEndpointsData = webhookEndpointCacheRsp.data;

    for (let uuid in webhookEndpointsData) {
      oThis.webhookIds.push(uuid);
      oThis.webhookEndpoints.push(webhookEndpointsData[uuid]);
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
        webhookEndpointUuids: oThis.webhookIds
      }).fetch(),
      webhookSubscriptionCacheRspData = webhookSubscriptionCacheRsp.data;

    console.log('----webhookSubscriptionCacheRspData-------', webhookSubscriptionCacheRspData);
    for (let i = 0; i < oThis.webhookEndpoints.length; i++) {
      let webhookEndpoint = oThis.webhookEndpoints[i],
        activeTopicList = webhookSubscriptionCacheRspData[webhookEndpoint.uuid].active;

      console.log('----webhookEndpoint.uuid-------', webhookEndpoint.uuid);
      console.log('----activeTopicList-------', activeTopicList);

      webhookEndpoint['topics'] = [];
      for (let j = 0; j < activeTopicList.length; j++) {
        webhookEndpoint['topics'].push(webhookSubscriptionConstants.invertedTopics[activeTopicList[j].topic]);
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
