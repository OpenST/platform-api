'use strict';
/**
 * Cache for workflow steps status. This cache class is used only to clear cache. KIT-API sets this cache.
 *
 * @module lib/kitSaasSharedCacheManagement/WorkflowStepsStatus
 */
const rootPrefix = '../..',
  BaseCacheManagement = require(rootPrefix + '/lib/kitSaasSharedCacheManagement/Base');

/**
 * Class for workflow steps status cache
 *
 * @class
 */
class WorkflowStepsStatus extends BaseCacheManagement {
  /**
   * Constructor for workflow steps status
   *
   * @param {Object} params - cache key generation & expiry related params
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.workflowId = params.workflowId;

    // Call sub class method to set cache key using params provided
    oThis._setCacheKeySuffix();

    // Call sub class method to set cache expiry using params provided
    oThis._setCacheExpiry();

    // Call sub class method to set cache implementer using params provided
    oThis._setCacheImplementer();
  }

  /**
   * Set cache key
   *
   * @return {String}
   */
  _setCacheKeySuffix() {
    const oThis = this;
    oThis.cacheKeySuffix = 'c_d_s_' + oThis.workflowId;
  }

  /**
   * Set cache expiry in oThis.cacheExpiry and return it
   *
   * @return {Number}
   */
  _setCacheExpiry() {
    const oThis = this;
    oThis.cacheExpiry = 3 * 24 * 60 * 60; // 72 hours ;
  }

  /**
   * This function should never be called. This cache should only be used to clear from saas-api.
   */
  async fetchDataFromSource() {
    throw 'This function is not supported in saas-api';
  }
}

module.exports = WorkflowStepsStatus;
