'use strict';

/**
 *
 * @module lib/cacheManagement/chain/Rule
 */

const rootPrefix = '../../..',
  BaseCacheManagement = require(rootPrefix + '/lib/cacheManagement/kitSaas/Base'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  RuleModel = require(rootPrefix + '/app/models/mysql/Rule');

class Rule extends BaseCacheManagement {
  /**
   * Constructor for token shard numbers cache
   *
   * @param {Object} params - cache key generation & expiry related params
   * @param params.tokenId {Number} - tokenId
   * @param params.name {String} - name
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenId = params.tokenId;
    oThis.name = params.name;

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
    oThis.cacheLevel = cacheManagementConst.saasSubEnvLevel;
  }

  /**
   * set cache key
   */
  _setCacheKeySuffix() {
    const oThis = this;
    // It uses shared cache key between company api and saas. any changes in key here should be synced
    oThis.cacheKeySuffix = `c_rl_${oThis.tokenId}_${oThis.name.toLowerCase()}`;
  }

  /**
   * set cache expiry in oThis.cacheExpiry
   */
  _setCacheExpiry() {
    const oThis = this;
    oThis.cacheExpiry = 24 * 60 * 60; // 1 day;
  }

  /**
   * fetch data from source
   *
   * @return {Result}
   */
  async _fetchDataFromSource() {
    const oThis = this;
    return new RuleModel().getDetails(oThis.tokenId, oThis.name);
  }
}

module.exports = Rule;
