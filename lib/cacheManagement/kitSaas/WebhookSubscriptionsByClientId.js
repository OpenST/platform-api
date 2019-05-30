/**
 * Module for webhook subscriptions by client id cache.
 *
 * @module lib/cacheManagement/kitSaas/WebhookSubscriptionsByClientId
 */

const rootPrefix = '../../..',
  BaseCacheManagement = require(rootPrefix + '/lib/cacheManagement/kitSaas/Base'),
  WebhookSubscriptionModel = require(rootPrefix + '/app/models/mysql/WebhookSubscription'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

/**
 * Class for webhook subscriptions by client id cache.
 *
 * @class WebhookSubscriptionsByClientIdCache
 */
class WebhookSubscriptionsByClientIdCache extends BaseCacheManagement {
  /**
   * Constructor for webhook subscriptions by client id cache.
   *
   * @param {object} params: cache key generation & expiry related params
   * @param {string} params.clientId: client id
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.clientId;

    // Call sub class method to set cache level
    oThis._setCacheLevel();

    // Call sub class method to set cache key using params provided
    oThis._setCacheKeySuffix();

    // Call sub class method to set cache expiry using params provided
    oThis._setCacheExpiry();

    // Call sub class method to set cache implementer using params provided
    oThis._setCacheImplementer();
  }

  /**
   * Set cache level.
   *
   * @sets oThis.cacheLevel
   * @private
   */
  _setCacheLevel() {
    const oThis = this;

    oThis.cacheLevel = cacheManagementConst.kitSaasSubEnvLevel;
  }

  /**
   * Set cache key suffix.
   *
   * @sets oThis.cacheKeySuffix
   * @private
   */
  _setCacheKeySuffix() {
    const oThis = this;
    // It uses shared cache key between company api and saas. Any changes in key here should be synced.
    oThis.cacheKeySuffix = `cm_ks_wsbc_${oThis.clientId}`;
  }

  /**
   * Set cache expiry in oThis.cacheExpiry.
   *
   * @sets oThis.cacheExpiry
   * @private
   */
  _setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 10 * 24 * 60 * 60; // 10 Days
  }

  /**
   * Fetch data from source and return webhook endpoint uuids array against active topics.
   *
   * @returns {Promise<*|result>}
   * @private
   */
  async _fetchDataFromSource() {
    const oThis = this;
    return new WebhookSubscriptionModel().fetchWebhookSubscriptionsByClientId(oThis.clientId);
  }
}

module.exports = WebhookSubscriptionsByClientIdCache;
