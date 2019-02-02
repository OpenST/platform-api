'use strict';
/**
 * Cache for workflows table.
 *
 * @module lib/cacheManagement/kitSaas/Workflow
 */
const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  WorkflowModel = require(rootPrefix + '/app/models/mysql/Workflow'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  BaseCacheManagement = require(rootPrefix + '/lib/cacheManagement/kitSaas/Base');

/**
 * Class for workflows table cache
 *
 * @class
 */
class WorkflowByClient extends BaseCacheManagement {
  /**
   * Constructor for workflows table cache
   *
   * @param {Object} params - cache key generation & expiry related params
   *
   * @constructor
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
   *
   * Set cache level
   *
   * @private
   */
  _setCacheLevel() {
    const oThis = this;
    oThis.cacheLevel = cacheManagementConst.kitSaasSubEnvLevel;
  }

  /**
   * Set cache key
   *
   * @return {String}
   */
  _setCacheKeySuffix() {
    const oThis = this;
    oThis.cacheKeySuffix = 'c_w_f_bc_' + oThis.clientId;
  }

  /**
   * Set cache expiry in oThis.cacheExpiry and return it
   *
   * @return {Number}
   */
  _setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 24 * 60 * 60; // 24 hours ;

    return oThis.cacheExpiry;
  }

  /**
   * Fetch data from source
   *
   * @return {Result}
   */
  async _fetchDataFromSource() {
    throw 'Fetch is not saas responsibillity..';
  }
}

module.exports = WorkflowByClient;
