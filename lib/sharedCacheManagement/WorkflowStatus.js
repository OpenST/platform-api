'use strict';
/**
 * Cache for workflow status. This cache class is used only to clear cache. KIT-API sets this cache.
 *
 * @module lib/sharedCacheManagement/WorkflowStatus
 */
const rootPrefix = '../..',
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  BaseSharedCacheManagement = require(rootPrefix + '/lib/sharedCacheManagement/Base');

/**
 * Class for workflow status cache
 *
 * @class
 */
class WorkflowStatus extends BaseSharedCacheManagement {
  /**
   * Constructor for workflow status cache
   *
   * @param {Object} params - cache key generation & expiry related params
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.cacheType = cacheManagementConst.sharedMemcached;
    oThis.consistentBehavior = '1';
    oThis.workflowId = params.workflowId;

    // Call sub class method to set cache key using params provided
    oThis.setCacheKey();

    // Call sub class method to set cache expiry using params provided
    oThis.setCacheExpiry();

    // Call sub class method to set cache implementer using params provided
    oThis.setCacheImplementer();
  }

  /**
   * Set cache key
   *
   * @return {String}
   */
  setCacheKey() {
    const oThis = this;

    oThis.cacheKey = oThis._sharedCacheKeyPrefix() + 'c_w_f_' + oThis.workflowId;

    return oThis.cacheKey;
  }

  /**
   * Set cache expiry in oThis.cacheExpiry and return it
   *
   * @return {Number}
   */
  setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 3 * 24 * 60 * 60; // 72 hours ;

    return oThis.cacheExpiry;
  }

  /**
   * This function should never be called. This cache should only be used to clear from saas-api.
   */
  async fetchDataFromSource() {
    throw 'This function is not supported in saas-api';
  }
}

module.exports = WorkflowStatus;
