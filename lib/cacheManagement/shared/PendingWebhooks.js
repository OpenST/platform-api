/**
 * Module for pending webhooks cache.
 *
 * @module lib/cacheManagement/shared/PendingWebhooks
 */

const rootPrefix = '../../..',
  PendingWebhookModel = require(rootPrefix + '/app/models/mysql/PendingWebhook'),
  CacheManagementSharedBase = require(rootPrefix + '/lib/cacheManagement/shared/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/app/models/ddb/shared/Shard');

/**
 * Class for pending webhooks cache.
 *
 * @class PendingWebhooks
 */
class PendingWebhooks extends CacheManagementSharedBase {
  /**
   * Constructor for pending webhooks cache.
   *
   * @param {object} params: cache key generation & expiry related params
   * @params {string} params.pendingWebhookId
   *
   * @augments CacheManagementSharedBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.pendingWebhookId = params.pendingWebhookId;

    oThis.cacheType = cacheManagementConst.sharedMemcached;
    oThis.consistentBehavior = '1';
    oThis.useObject = true;

    // Call sub class method to set cache level.
    oThis._setCacheLevel();

    // Call sub class method to set cache key using params provided.
    oThis.setCacheKey();

    // Call sub class method to set cache expiry using params provided.
    oThis.setCacheExpiry();

    // Call sub class method to set cache implementer using params provided.
    oThis.setCacheImplementer();
  }

  /**
   * Set cache level.
   *
   * @sets oThis.cacheLevel
   *
   * @private
   */
  _setCacheLevel() {
    const oThis = this;

    oThis.cacheLevel = cacheManagementConst.saasSubEnvLevel;
  }

  /**
   * Set cache key.
   *
   * @sets oThis.cacheKey
   *
   * @return {string}
   */
  setCacheKey() {
    const oThis = this;

    oThis.cacheKey = oThis._sharedCacheKeyPrefix() + 'c_p_wh_' + oThis.pendingWebhookId;

    return oThis.cacheKey;
  }

  /**
   * Set cache expiry in oThis.cacheExpiry and return it.
   *
   * @sets oThis.cacheExpiry
   *
   * @return {number}
   */
  setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 10 * 60; // 10 minutes.

    return oThis.cacheExpiry;
  }

  /**
   * Fetch data from source.
   *
   * @return {Result}
   */
  async fetchDataFromSource() {
    const oThis = this;

    const response = await new PendingWebhookModel()
      .select('*')
      .where({ id: oThis.pendingWebhookId })
      .fire();

    const finalResponse = response[0];

    logger.log('response from pending webhooks cache  ========', finalResponse);

    if (finalResponse) {
      let extraData = null;

      if (finalResponse.extra_data) {
        extraData = JSON.parse(finalResponse.extra_data);
      }

      const dataToSet = {
        clientId: finalResponse.client_id,
        eventUuid: finalResponse.event_uuid,
        webhookTopicKind: finalResponse.webhook_topic_kind,
        extraData: extraData,
        status: finalResponse.status,
        retryCount: finalResponse.retry_count,
        nextRetryAt: finalResponse.next_retry_at,
        createdAt: finalResponse.created_at
      };

      logger.log('dataToSet ========', dataToSet);

      return responseHelper.successWithData(dataToSet);
    }

    return responseHelper.error({
      internal_error_identifier: 'l_cm_s_pw_1',
      api_error_identifier: 'unhandled_catch_response',
      debug_options: { errorData: finalResponse }
    });
  }
}

module.exports = PendingWebhooks;
