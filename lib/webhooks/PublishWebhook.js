/**
 * Module to publish webhook.
 *
 * @module lib/webhooks/PublishWebhook
 */

const rootPrefix = '../..',
  WebhookPostKlass = require(rootPrefix + '/lib/WebhookPost'),
  PendingWebhookModel = require(rootPrefix + '/app/models/mysql/PendingWebhook'),
  WebhookEventFormatter = require(rootPrefix + '/lib/formatter/v2/WebhookEvent'),
  PendingWebhooksCache = require(rootPrefix + '/lib/cacheManagement/shared/PendingWebhooks'),
  WebhookEndpointsByUuidCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/WebhookEndpointsByUuid'),
  webhookEndpointsConstants = require(rootPrefix + '/lib/globalConstant/webhookEndpoints'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  localCipher = require(rootPrefix + '/lib/encryptors/localCipher'),
  pendingWebhookConstants = require(rootPrefix + '/lib/globalConstant/pendingWebhook');

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
   * @param {boolean} [params.retryWebhook]: is webhook being retried or not.
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.pendingWebhookId = params.pendingWebhookId;
    oThis.retryWebhook = params.retryWebhook || false;

    oThis.pendingWebhook = null;
    oThis.webhookEndpoints = null;

    oThis.webhookEndpointUuids = [];
    oThis.entity = null;
    oThis.apiSecret = null;
    oThis.apiGraceSecret = null;
    oThis.mappyErrors = {};
    oThis.failedWebhookEndpointUuid = [];
    oThis.updateData = {};
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

      await oThis._markPendingWebhookFailed().catch(function(err) {
        logger.error('could not mark pendingWebhooks fail', err);
      });

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

    await oThis._resetCache();
  }

  /**
   * Get pending webhook details.
   *
   * @sets oThis.pendingWebhook
   *
   * @returns {Promise}
   * @private
   */
  async _getPendingWebhookDetails() {
    const oThis = this;

    const pendingWebhookCacheResp = await new PendingWebhooksCache({
      pendingWebhookId: oThis.pendingWebhookId
    }).fetch();

    if (pendingWebhookCacheResp.isSuccess()) {
      oThis.pendingWebhook = pendingWebhookCacheResp.data;

      await new PendingWebhookModel()
        .update({
          status: pendingWebhookConstants.invertedStatuses[pendingWebhookConstants.inProgressStatus]
        })
        .where({ id: oThis.pendingWebhookId })
        .fire();
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
   * @returns {Promise}
   * @private
   */
  async _getEndpointDetails() {
    const oThis = this;

    let webhookEndpointUuids = [];
    if (
      oThis.pendingWebhook.extraData.failedWebhookEndpointUuid &&
      oThis.pendingWebhook.extraData.failedWebhookEndpointUuid.length > 0
    ) {
      webhookEndpointUuids = oThis.pendingWebhook.extraData.failedWebhookEndpointUuid;
    } else {
      webhookEndpointUuids = oThis.pendingWebhook.extraData.webhookEndpointUuid;
    }
    logger.log('----webhookEndpointUuids-----------', webhookEndpointUuids);

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

    return responseHelper.successWithData({});
  }

  /**
   * Fire webhook.
   *
   * @sets oThis.mappyErrors, oThis.failedWebhookEndpointUuid
   *
   * @returns {Promise}
   * @private
   */
  async _fireWebhook() {
    const oThis = this;

    for (const webhookEndpointUuid in oThis.webhookEndpoints) {
      const webhookEndpoint = oThis.webhookEndpoints[webhookEndpointUuid],
        webhookStatus = webhookEndpointsConstants.invertedStatuses[webhookEndpointsConstants.activeStatus];

      if (!webhookEndpoint || webhookEndpoint.status != webhookStatus || !webhookEndpoint.secret) {
        continue;
      }

      const apiSecrets = [],
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
        apiEndpoint: webhookEndpoint.endpoint
      });

      const postResponse = await webhookPost.post(webhookEvent);
      if (postResponse.isFailure()) {
        oThis.mappyErrors[webhookEndpointUuid] = postResponse.getDebugData();
        oThis.failedWebhookEndpointUuid.push(webhookEndpointUuid);
      }
    }

    if (oThis.failedWebhookEndpointUuid.length > 0) {
      await oThis._markPendingWebhookFailed();
    } else {
      await oThis._markPendingWebhookCompleted();
    }

    logger.log('------oThis.mappyErrors-------', JSON.stringify(oThis.mappyErrors));
    logger.log('------oThis.failedWebhookEndpointUuid-------', JSON.stringify(oThis.failedWebhookEndpointUuid));
  }

  /**
   * Mark pendingWebhook failed or completely failed.
   *
   * @sets oThis.updateData
   *
   * @returns {Promise}
   * @private
   */
  async _markPendingWebhookFailed() {
    const oThis = this;

    if (!oThis.pendingWebhook) {
      return responseHelper.successWithData({});
    }

    if (oThis.pendingWebhook.retryCount >= pendingWebhookConstants.maxRetryCount) {
      oThis.updateData.status =
        pendingWebhookConstants.invertedStatuses[pendingWebhookConstants.completelyFailedStatus];
    } else if (oThis.failedWebhookEndpointUuid.length > 0) {
      oThis.updateData.status = pendingWebhookConstants.invertedStatuses[pendingWebhookConstants.failedStatus];
      oThis.updateData.extra_data = oThis.pendingWebhook.extraData;
      oThis.updateData.extra_data.failedWebhookEndpointUuid = oThis.failedWebhookEndpointUuid;
      oThis.updateData.extra_data = JSON.stringify(oThis.updateData.extra_data);

      const retryDetails = oThis._getRetryDetails();

      oThis.updateData.retry_count = retryDetails.retryCount;
      oThis.updateData.next_retry_at = retryDetails.nextRetryAt;
      oThis.updateData.mappy_error = JSON.stringify(oThis.mappyErrors);
    }

    await oThis._updatePendingWebhook();

    return responseHelper.successWithData({});
  }

  /**
   * Mark pendingWebhook completed.
   *
   * @sets oThis.updateData
   *
   * @returns {Promise}
   * @private
   */
  async _markPendingWebhookCompleted() {
    const oThis = this;

    oThis.updateData.status = pendingWebhookConstants.invertedStatuses[pendingWebhookConstants.completedStatus];

    await oThis._updatePendingWebhook();

    return responseHelper.successWithData({});
  }

  /**
   * Update PendingWebhook
   *
   * @returns {Promise}
   * @private
   */
  async _updatePendingWebhook() {
    const oThis = this;

    oThis.updateData.lock_id = null;

    await new PendingWebhookModel()
      .update(oThis.updateData)
      .where({ id: oThis.pendingWebhookId })
      .fire();
  }

  /**
   * Get retry datails
   *
   * @returns {{retryCount: number, nextRetryAt: *}}
   * @private
   */
  _getRetryDetails() {
    const oThis = this;

    let retryCount = 0;
    if (oThis.retryWebhook) {
      retryCount = oThis.pendingWebhook.retryCount + 1;
    }

    return {
      retryCount: retryCount,
      nextRetryAt: Math.floor(Date.now() / 1000) + pendingWebhookConstants.getNextRetryAtDelta(retryCount)
    };
  }

  /**
   * Reset cache with new data.
   *
   * @returns {Promise}
   * @private
   */
  async _resetCache() {
    const oThis = this;

    oThis.pendingWebhook.status = oThis.updateData.status || oThis.pendingWebhook.status;
    if (oThis.updateData.extra_data) {
      oThis.pendingWebhook.extraData = JSON.parse(oThis.updateData.extra_data);
    }
    oThis.pendingWebhook.retryCount = oThis.updateData.retry_count || oThis.pendingWebhook.retryCount;
    oThis.pendingWebhook.nextRetryAt = oThis.updateData.next_retry_at || oThis.pendingWebhook.nextRetryAt;

    await new PendingWebhooksCache({
      pendingWebhookId: oThis.pendingWebhookId
    })._setCache(oThis.pendingWebhook);
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
    logger.log('----------oThis.apiSecret--', oThis.apiSecret);

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
