'use strict';
/**
 * Cache for fetching chain config strategy ids. Extends base cache.
 *
 * @module lib/sharedCacheManagement/ClientConfigGroup
 */
const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ClientConfigGroup = require(rootPrefix + '/app/models/mysql/ClientConfigGroup'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  CacheManagementSharedBase = require(rootPrefix + '/lib/cacheManagement/shared/Base');

/**
 * Cache class for fetching chain config strategy ids.
 *
 * @class
 */
class ClientConfigGroupCache extends CacheManagementSharedBase {
  /**
   * Constructor for Client config group cache
   *
   * @param {Object} params - cache key generation & expiry related params
   *
   * @augments CacheManagementSharedBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.clientId;
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
   * Fetch data from source
   *
   * @return {Result}
   */
  async fetchDataFromSource() {
    const oThis = this;

    let strategyIdResponse = await new ClientConfigGroup()
      .select(['chain_id', 'group_id'])
      .where(['client_id = ?', oThis.clientId])
      .fire();

    if (strategyIdResponse.length !== 1) {
      return responseHelper.error({
        internal_error_identifier: 'l_scm_ccg_1',
        api_error_identifier: 'invalid_api_params',
        debug_options: { client_id: oThis.clientId }
      });
    }

    let responseData = {};
    responseData[oThis.clientId] = {
      chainId: strategyIdResponse[0].chain_id,
      groupId: strategyIdResponse[0].group_id
    };

    return responseHelper.successWithData(responseData);
  }
}

module.exports = ClientConfigGroupCache;
