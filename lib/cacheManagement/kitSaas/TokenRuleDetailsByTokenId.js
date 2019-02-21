'use strict';

/**
 *
 * @module lib/cacheManagement/kitSaas/RuleIdsByTokenId
 */

const rootPrefix = '../../..',
  BaseCacheManagement = require(rootPrefix + '/lib/cacheManagement/kitSaas/Base'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  TokenRuleModel = require(rootPrefix + '/app/models/mysql/TokenRule');

class TokenRuleDetailsByTokenId extends BaseCacheManagement {
  /**
   * Constructor for token shard numbers cache
   * @param params.tokenId {Number} - tokenId
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenId = params.tokenId;

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
    oThis.cacheKeySuffix = `cm_ks_rbt_${oThis.tokenId}`;
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

    return new TokenRuleModel().getDetailsByTokenId(oThis.tokenId);
  }
}

module.exports = TokenRuleDetailsByTokenId;
