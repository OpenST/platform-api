/**
 * Module to create new webhook.
 *
 * @module app/services/webhooks/modify/Create
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  WebhookEndpointModel = require(rootPrefix + '/app/models/mysql/WebhookEndpoint'),
  WebhookEndpointsByUuidCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/WebhookEndpointsByUuid'),
  WebhookSecretByClientIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/WebhookSecret'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class to create new webhook.
 *
 * @class DeleteWebhookGraceSecret
 */
class DeleteWebhookGraceSecret extends ServiceBase {
  /**
   * Constructor to create new webhook.
   *
   * @param {object} params
   * @param {number} params.client_id: client id
   *
   * @constructor
   */
  constructor(params) {
    super();

    const oThis = this;

    oThis.clientId = params.client_id;

    oThis.clientEndpointUuids = [];
  }

  /**
   * Async perform: Perform webhook creation.
   *
   * @return {Promise}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._getClientEndpoints();

    await oThis._removeGraceSecret();

    await oThis._clearCache();

    return responseHelper.successWithData({});
  }

  /**
   * Get All endpoints of client
   *
   * @returns {Promise}
   * @private
   */
  async _getClientEndpoints() {
    const oThis = this;

    const endpoints = await new WebhookEndpointModel()
      .select('*')
      .where({ client_id: oThis.clientId })
      .fire();

    for (let i = 0; i < endpoints.length; i++) {
      oThis.clientEndpointUuids.push(endpoints[i].uuid);
    }

    return responseHelper.successWithData({});
  }

  /**
   * remove grace secret
   *
   * @returns {Promise}
   * @private
   */
  async _removeGraceSecret() {
    const oThis = this;

    await new WebhookEndpointModel()
      .update({ grace_secret: null, grace_expiry_at: null })
      .where({ client_id: oThis.clientId })
      .fire();

    return responseHelper.successWithData({});
  }

  /**
   * Clear cache.
   *
   * @returns {Promise}
   * @private
   */
  async _clearCache() {
    const oThis = this;

    // Clear webhook endpoints cache.
    await new WebhookEndpointsByUuidCache({ webhookEndpointUuids: oThis.clientEndpointUuids }).clear();

    await new WebhookSecretByClientIdCache({ clientId: oThis.clientId }).clear();

    return responseHelper.successWithData({});
  }
}

InstanceComposer.registerAsShadowableClass(
  DeleteWebhookGraceSecret,
  coreConstants.icNameSpace,
  'DeleteWebhookGraceSecretInternal'
);

module.exports = {};
