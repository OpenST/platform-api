'use strict';

/*
 * Cache for workflow steps
 */

const rootPrefix = '../..',
  BaseSharedCacheManagement = require(rootPrefix + '/lib/sharedCacheManagement/Base'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

class WorkflowSteps extends BaseSharedCacheManagement {
  /**
   * Constructor for ClientConfigGroupCache
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
   * set cache key
   *
   * @return {String}
   */
  setCacheKey() {
    const oThis = this;

    oThis.cacheKey = oThis._sharedCacheKeyPrefix() + 'c_d_s_' + oThis.workflowId;

    return oThis.cacheKey;
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   *
   * @return {Number}
   */
  setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 3 * 24 * 60 * 60; // 72 hours ;

    return oThis.cacheExpiry;
  }

  /**
   *
   * This function should never be called. As this cache should only be cleared from saas-api
   *
   * @return {}
   */
  async fetchDataFromSource() {
    throw 'This function is not supported in saas-api';
  }
}

module.exports = WorkflowSteps;
