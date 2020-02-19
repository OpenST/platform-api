'use strict';
/**
 * Cache for admin row.
 *
 * @module lib/cacheManagement/kitSaas/Admin
 */

const rootPrefix = '../../..',
  Admin = require(rootPrefix + '/app/models/mysql/Admin'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  BaseCacheManagement = require(rootPrefix + '/lib/cacheManagement/kitSaas/Base');

/**
 * Class for admin cache
 *
 * @class
 */
class AdminCache extends BaseCacheManagement {
  /**
   * Constructor for admin cache
   *
   * @param {Object} params - cache key generation & expiry related params
   *
   * @augments BaseCacheManagement
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.adminId = params.id;

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
   * set cache keys
   */
  _setCacheKeySuffix() {
    const oThis = this;
    oThis.cacheKeySuffix = `c_adm_by_id_${oThis.adminId}`;
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   */
  _setCacheExpiry() {
    const oThis = this;
    oThis.cacheExpiry = 24 * 60 * 60; // 24 hours ;
  }

  /**
   * fetch data from source
   *
   * @return {Result}
   */
  async _fetchDataFromSource() {
    const oThis = this;
    return new Admin().fetchById(oThis.adminId);
  }
}

module.exports = AdminCache;
