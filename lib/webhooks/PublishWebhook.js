/**
 * Module to publish webhook.
 *
 * @module lib/webhooks/PublishWebhook
 */

const rootPrefix = '../..',
  WebhookPostKlass = require(rootPrefix + '/lib/WebhookPost'),
  WebhookEventFormatter = require(rootPrefix + '/lib/formatter/v2/WebhookEvent'),
  PendingWebhooksCache = require(rootPrefix + '/lib/cacheManagement/shared/PendingWebhooks'),
  WebhookEndpointsByUuidCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/WebhookEndpointsByUuid'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  localCipher = require(rootPrefix + '/lib/encryptors/localCipher');

/**
 * Class to publish webhook.
 *
 * @class PublishWebhook
 */
class PublishWebhook {
  /**
   * Constructor to publish webhook.
   *
   * @param {object} params
   * @param {array} params.pendingWebhookId: pending webhook id.
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.pendingWebhookId = params.pendingWebhookId;

    oThis.pendingWebhook = null;
    oThis.webhookEndpoints = null;

    oThis.webhookEndpointUuids = [];
    oThis.entity = null;
    oThis.apiSecret = null;
    oThis.apiGraceSecret = null;
    oThis.mappyErrors = {};
    oThis.failedWebhookEndpointUuid = [];
  }

  /**
   * Main performer for class.
   *
   * @returns {Promise}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(async function(error) {
      logger.error('lib/webhooks/PublishWebhook.js::perform::catch');
      logger.error(error);

      if (responseHelper.isCustomResult(error)) {
        logger.error(error.getDebugData());

        return error;
      }

      return responseHelper.error({
        internal_error_identifier: 'l_w_pw_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: { error: error }
      });
    });
  }

  /**
   * Async perform.
   *
   * @returns {Promise<>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis._getPendingWebhookDetails();

    await oThis._getEndpointDetails();

    await oThis._fireWebhook();
  }

  /**
   * Get pending webhook details.
   *
   * @sets oThis.pendingWebhook
   *
   * @returns {Promise<*|result|Promise<Promise<never>|*>>}
   * @private
   */
  async _getPendingWebhookDetails() {
    const oThis = this;

    const pendingWebhookCacheResp = await new PendingWebhooksCache({
      pendingWebhookId: oThis.pendingWebhookId
    }).fetch();

    if (pendingWebhookCacheResp.isSuccess()) {
      oThis.pendingWebhook = pendingWebhookCacheResp.data;
    } else {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_w_pw_2',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: { pendingWebhookCacheResp: pendingWebhookCacheResp }
        })
      );
    }

    return responseHelper.successWithData({});
  }

  /**
   * Get endpoint details.
   *
   * @sets oThis.webhookEndpoints
   *
   * @returns {Promise<Promise<never>|undefined>}
   * @private
   */
  async _getEndpointDetails() {
    const oThis = this;

    const webhookEndpointUuids = oThis.pendingWebhook.extraData.webhookEndpointUuid;

    const webhookEndpointsCacheResp = await new WebhookEndpointsByUuidCache({
      webhookEndpointUuids: webhookEndpointUuids
    }).fetch();

    if (webhookEndpointsCacheResp.isSuccess()) {
      oThis.webhookEndpoints = webhookEndpointsCacheResp.data;
    } else {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_w_pw_3',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: { webhookEndpointsCacheResp: webhookEndpointsCacheResp }
        })
      );
    }
  }

  /**
   * Fire webhook.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fireWebhook() {
    const oThis = this;

    for (const webhookEndpointUuid in oThis.webhookEndpoints) {
      const webhookEndpoint = oThis.webhookEndpoints[webhookEndpointUuid],
        apiSecrets = [],
        apiVersion = webhookEndpoint.apiVersion;

      apiSecrets.push(await oThis._getSecret(webhookEndpoint.secret));

      if (webhookEndpoint.graceSecret) {
        apiSecrets.push(await oThis._getGraceSecret(webhookEndpoint.graceSecret));
      }

      const webhookEvent = new WebhookEventFormatter({
        pendingWebhook: oThis.pendingWebhook,
        rawWebhook: webhookEndpoint
      }).perform();

      const webhookPost = new WebhookPostKlass({
        apiSecrets: apiSecrets,
        apiEndpoint: webhookEndpoint.endpoint,
        apiVersion: apiVersion
      });

      const postResponse = await webhookPost.post(webhookEvent);

      console.log('------postResponse-------', postResponse);

      if (postResponse.isFailure()) {
        oThis.mappyErrors[webhookEndpointUuid] = postResponse.getDebugData();
        oThis.failedWebhookEndpointUuid.push(webhookEndpointUuid);
      }
    }

    console.log('------oThis.mappyErrors-------', JSON.stringify(oThis.mappyErrors));
    console.log('------oThis.failedWebhookEndpointUuid-------', JSON.stringify(oThis.failedWebhookEndpointUuid));
  }

  /**
   * Since secret is same for all endpoints of a client, dont decrypt secret always.
   *
   * @param {string} secret
   *
   * @sets oThis.apiSecret
   *
   * @returns {Promise}
   * @private
   */
  async _getSecret(secret) {
    const oThis = this;

    if (oThis.apiSecret || !secret) {
      return oThis.apiSecret;
    }

    oThis.apiSecret = await localCipher.decrypt(coreConstants.CACHE_SHA_KEY, secret);
    console.log('----------oThis.apiSecret--', oThis.apiSecret);

    return oThis.apiSecret;
  }

  /**
   * Since secret is same for all endpoints of a client, dont decrypt secret always.
   *
   * @param {string} secret
   *
   * @sets oThis.apiGraceSecret
   *
   * @returns {Promise}
   * @private
   */
  async _getGraceSecret(secret) {
    const oThis = this;

    if (oThis.apiGraceSecret || !secret) {
      return oThis.apiGraceSecret;
    }

    oThis.apiGraceSecret = await localCipher.decrypt(coreConstants.CACHE_SHA_KEY, secret);

    return oThis.apiGraceSecret;
  }
}

module.exports = PublishWebhook;
