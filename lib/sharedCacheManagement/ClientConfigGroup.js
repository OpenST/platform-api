'use strict';

/*
 * Cache for fetching chain config strategy ids. Extends base cache.
 */

const rootPrefix = '../..',
  BaseSharedCacheManagement = require(rootPrefix + '/lib/sharedCacheManagement/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ClientConfigGroup = require(rootPrefix + '/app/models/mysql/ClientConfigGroup'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

class ClientConfigGroupCache extends BaseSharedCacheManagement {
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

    oThis.clientId = params.clientId;
    oThis.cacheType = cacheManagementConst.sharedMemcached;
    oThis.consistentBehavior = '1';

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

    oThis.cacheKey = oThis._sharedCacheKeyPrefix() + 'c_c_ccg_' + oThis.clientId;

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

    let strategyIdResponse = await new ClientConfigGroup()
      .select(['chain_id, group_id'])
      .where(['client_id = ?', oThis.clientId])
      .fire();

    return responseHelper.successWithData({
      chainId: strategyIdResponse[0].chain_id,
      groupId: strategyIdResponse[0].group_id
    });
  }
}

module.exports = ClientConfigGroupCache;
