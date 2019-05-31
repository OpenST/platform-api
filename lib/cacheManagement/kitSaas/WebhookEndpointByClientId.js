/**
 * Module for webhook endpoints cache.
 *
 * @module lib/cacheManagement/kitSaas/WebhookEndpoint
 */

const uuidV4 = require('uuid/v4');

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

    // Call sub class method to set base cache level
    oThis._setCacheBaseKey();

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
   * Fetch
   *
   * @return {Promise<*>}
   */
  async fetch() {
    const oThis = this;

    await oThis._setCacheKey();

    return super.fetch();
  }

  /**
   * set cache key using version.
   * Version is used to invalidate all caches of chain.
   *
   * @return {String}
   */
  async _setCacheKey() {
    const oThis = this;

    // cache hit for version
    let versionCacheResponse = await oThis.cacheImplementer.getObject(oThis._versionCacheKey);

    let versionDetail = null;

    if (versionCacheResponse.isSuccess() && versionCacheResponse.data.response != null) {
      versionDetail = versionCacheResponse.data.response;
    }

    if (!versionDetail || versionCacheResponse.isFailure() || versionDetail.limit !== oThis.limit) {
      // set version cache
      versionDetail = {
        v: uuidV4(),
        limit: oThis.limit
      };

      // NOTE: Set this key only on page one. If it's set on every page request. There is a possibility of some data
      // not being included in any page
      if (Number(oThis.page) === 1) {
        await oThis.cacheImplementer.setObject(oThis._versionCacheKey, versionDetail, oThis.cacheExpiry);
      }
    }

    oThis.cacheKeySuffix = oThis.cacheBaseKey + '_' + versionDetail.v + '_' + oThis.page;
  }

  /**
   * Set cache key suffix.
   *
   * @sets oThis.cacheKeySuffix
   *
   * @private
   */
  _setCacheBaseKey() {
    const oThis = this;
    // It uses shared cache key between company api and saas. Any changes in key here should be synced.
    oThis.cacheBaseKey = 'cm_ks_webci_' + oThis.clientId.toString();
  }

  /**
   * Set base cache key
   *
   * @private
   */
  get _versionCacheKey() {
    const oThis = this;

    return oThis.cacheBaseKey + '_v';
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

  /**
   * Delete the cache entry
   *
   * @returns {Promise<*>}
   */
  clear() {
    const oThis = this;

    return oThis.cacheImplementer.del(oThis._versionCacheKey);
  }
}

module.exports = WebhookEndpointByClientId;
