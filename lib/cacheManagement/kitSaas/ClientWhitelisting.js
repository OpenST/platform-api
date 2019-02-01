'use strict';
/**
 * Cache for client whitelisting details.
 *
 * @module lib/cacheManagement/kitSaas/ClientWhitelisting
 */

const rootPrefix = '../../..',
  ClientWhitelistingModel = require(rootPrefix + '/app/models/mysql/ClientWhitelisting'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  BaseCacheManagement = require(rootPrefix + '/lib/cacheManagement/kitSaas/Base');

/**
 * Class for token details cache
 *
 * @class
 */
class ClientWhitelisting extends BaseCacheManagement {
  /**
   * Constructor for token details cache
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
   * set cache keys
   *
   * @private
   */
  _setCacheKeySuffix() {
    const oThis = this;
    oThis.cacheKeySuffix = `c_wlsting_${oThis.clientId}`;
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
    return await new ClientWhitelistingModel().getDetailsByClientId(oThis.clientId);
  }
}

module.exports = ClientWhitelisting;
