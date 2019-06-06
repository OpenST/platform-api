'use strict';

const rootPrefix = '../..',
  PendingWebhooksCache = require(rootPrefix + '/lib/cacheManagement/shared/PendingWebhooks'),
  WebhookEndpointsByUuidCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/WebhookEndpointsByUuid'),
  localCipher = require(rootPrefix + '/lib/encryptors/localCipher'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  WebhookEventFormatter = require(rootPrefix + '/lib/formatter/v2/WebhookEvent'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  WebhookPostKlass = require(rootPrefix + '/lib/webhookPost');

class PublishWebhook {
  /**
   *
   * @param {object} params
   * @param {Array} params.pendingWebhookId - pending webhook id.
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
      logger.error('lib/webhooks/PublishWebhook::perform::catch');
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

  async _getPendingWebhookDetails() {
    const oThis = this;

    let pendingWebhookCacheResp = await new PendingWebhooksCache({ pendingWebhookId: oThis.pendingWebhookId }).fetch();

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

  async _getEndpointDetails() {
    const oThis = this;
    let webhookEndpointUuids = oThis.pendingWebhook.extraData.webhookEndpointUuid;

    let webhookEndpointsCacheResp = await new WebhookEndpointsByUuidCache({
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

  async _fireWebhook() {
    const oThis = this;

    for (let webhookEndpointUuid in oThis.webhookEndpoints) {
      let webhookEndpoint = oThis.webhookEndpoints[webhookEndpointUuid],
        apiSecrets = [],
        apiVersion = webhookEndpoint.apiVersion;

      apiSecrets.push(await oThis._getSecret(webhookEndpoint.secret));
      if (webhookEndpoint.graceSecret) {
        apiSecrets.push(await oThis._getGraceSecret(webhookEndpoint.graceSecret));
      }

      let webhookEvent = new WebhookEventFormatter({
        pendingWebhook: oThis.pendingWebhook,
        rawWebhook: webhookEndpoint
      }).perform();

      let webhookPost = new WebhookPostKlass({
        apiSecrets: apiSecrets,
        apiEndpoint: webhookEndpoint.endpoint,
        apiVersion: apiVersion
      });
      let postResponse = await webhookPost.post(webhookEvent);
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
   * @param secret
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
   * @param secret
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
