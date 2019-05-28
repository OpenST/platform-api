/**
 * Cache for webhook subscription topics by webhook endpoint id.
 *
 * @module lib/cacheManagement/kitSaasMulti/WebhookSubscriptionsByEndpointId
 */

const rootPrefix = '../../..',
  WebhookSubscriptionModel = require(rootPrefix + '/app/models/mysql/WebhookSubscription'),
  BaseKitSaasMultiCacheManagement = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/Base'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

/**
 * Class for webhook subscriptions by endpoint id cache.
 *
 * @class WebhookTopicsByEndpointId
 */
class WebhookSubscriptionsByEndpointId extends BaseKitSaasMultiCacheManagement {
  /**
   * Constructor for webhook subscriptions by endpoint id cache.
   *
   * @param {object} params: cache key generation & expiry related params
   * @param {array<string/number>} params.webhookEndpointIds
   *
   * @augments WebhookSubscriptionsByEndpointId
   *
   * @constructor
   */
  constructor(params) {
    super();

    const oThis = this;

    oThis.webhookEndpointIds = params.webhookEndpointIds;
    oThis.cacheType = cacheManagementConst.sharedMemcached;

    // Call sub class method to set cache level.
    oThis._setCacheLevel();

    // Call sub class method to set cache keys using params provided.
    oThis._setCacheKeys();

    // Call sub class method to set inverted cache keys using params provided.
    oThis._setInvertedCacheKeys();

    // Call sub class method to set cache expiry using params provided.
    oThis._setCacheExpiry();

    // Call sub class method to set cache implementer using params provided.
    oThis._setCacheImplementer();
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

    oThis.cacheLevel = cacheManagementConst.kitSaasSubEnvLevel;
  }

  /**
   * Set cache keys.
   *
   * @sets oThis.saasCacheKeys
   *
   * @private
   */
  _setCacheKeys() {
    const oThis = this;

    // It uses shared cache key between company api and saas. Any changes in key here should be synced.
    for (let index = 0; index < oThis.webhookEndpointIds.length; index++) {
      oThis.saasCacheKeys[oThis._saasCacheKeyPrefix() + 'c_ksm_cur_' + oThis.webhookEndpointIds[index]] =
        oThis.webhookEndpointIds[index];
      // NOTE: We are not setting kitCacheKeys here as the cacheLevel is only saasSubEnvLevel.
    }
  }

  /**
   * Set cache expiry.
   *
   * @sets oThis.cacheExpiry
   *
   * @private
   */
  _setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 24 * 60 * 60; // 1 day
  }

  /**
   * Fetch data from source.
   *
   * @param {array<string/number>} stakeCurrencyIds
   *
   * @returns {Promise<*>}
   * @private
   */
  _fetchDataFromSource(webhookEndpointIds) {
    return new WebhookSubscriptionModel().fetchWebhookSubscriptionsByEndpointIds(webhookEndpointIds);
  }
}

module.exports = WebhookSubscriptionsByEndpointId;
