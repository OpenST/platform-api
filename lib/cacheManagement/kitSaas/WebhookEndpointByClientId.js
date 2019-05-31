/**
 * Module for webhook endpoints cache.
 *
 * @module lib/cacheManagement/kitSaas/WebhookEndpoint
 */

const rootPrefix = '../../..',
  BaseCacheManagement = require(rootPrefix + '/lib/cacheManagement/kitSaas/Base'),
  WebhookEndpointModel = require(rootPrefix + '/app/models/mysql/WebhookEndpoint'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

/**
 * Class for webhook endpoints cache.
 *
 * @class WebhookEndpointByClientId
 */
class WebhookEndpointByClientId extends BaseCacheManagement {
  /**
   * Constructor for webhook endpoints cache.
   *
   * @param {object} params: cache key generation & expiry related params
   * @param {string} params.clientId: clientId
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.clientId;
    oThis.limit = params.limit;
    oThis.page = params.page;

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
   *
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
   *
   * @private
   */
  _setCacheKeySuffix() {
    const oThis = this;
    // It uses shared cache key between company api and saas. Any changes in key here should be synced.
    oThis.cacheKeySuffix = `cm_ks_webci_${oThis.clientId}_${oThis.limit}_${oThis.page}`;
  }

  /**
   * Set cache expiry in oThis.cacheExpiry.
   *
   * @sets oThis.cacheExpiry
   *
   * @private
   */
  _setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 86400; // 24 hours
  }

  /**
   * Fetch data from source and return client secrets using local encryption.
   *
   * @returns {Promise<*|result>}
   * @private
   */
  async _fetchDataFromSource() {
    const oThis = this;

    const webhookEndpointsDataMap = await new WebhookEndpointModel().fetchAllByClientId({
      clientId: oThis.clientId,
      limit: oThis.limit,
      page: oThis.page
    });

    return responseHelper.successWithData(webhookEndpointsDataMap);
  }
}

module.exports = WebhookEndpointByClientId;
