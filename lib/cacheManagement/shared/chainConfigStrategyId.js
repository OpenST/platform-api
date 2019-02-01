'use strict';

/*
 * Cache for fetching chain config strategy ids. Extends base cache.
 */

const rootPrefix = '../../..',
  CacheManagementSharedBase = require(rootPrefix + '/lib/cacheManagement/shared/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ConfigStrategyModel = require(rootPrefix + '/app/models/mysql/ConfigStrategy'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

class ChainConfigStrategyIds extends CacheManagementSharedBase {
  /**
   * Constructor for all token transfers by transaction hash cache
   *
   * @param {Object} params - cache key generation & expiry related params
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.chainId = params.chainId;
    oThis.cacheType = cacheManagementConst.sharedMemcached;
    oThis.consistentBehavior = '1';

    // Call sub class method to set cache level
    oThis._setCacheLevel();

    // Call sub class method to set cache key using params provided
    oThis.setCacheKey();

    // Call sub class method to set cache expiry using params provided
    oThis.setCacheExpiry();

    // Call sub class method to set cache implementer using params provided
    oThis.setCacheImplementer();
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
   *
   * @return {String}
   */
  setCacheKey() {
    const oThis = this;

    oThis.cacheKey = oThis._sharedCacheKeyPrefix() + 'c_c_cs_' + oThis.chainId;

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
   * fetch data from source
   *
   * @return {Result}
   */
  async fetchDataFromSource() {
    const oThis = this;

    let whereClause = ['chain_id = ? OR chain_id = 0', oThis.chainId];

    let strategyIdResponse = await new ConfigStrategyModel()
      .select(['id'])
      .where(whereClause)
      .fire();

    let strategyIdsArray = [];

    for (let index in strategyIdResponse) {
      strategyIdsArray.push(strategyIdResponse[index].id);
    }

    return responseHelper.successWithData({ strategyIds: strategyIdsArray });
  }
}

module.exports = ChainConfigStrategyIds;
