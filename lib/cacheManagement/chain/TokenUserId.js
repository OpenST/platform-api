'use strict';

/**
 * Cache for fetching user addresses by token id. Extends base cache.
 *
 * @module lib/cacheManagement/chain/TokenUserId.js
 */
const OSTBase = require('@ostdotcom/base'),
  uuidV4 = require('uuid/v4');

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  ChainCacheManagementBase = require(rootPrefix + '/lib/cacheManagement/chain/Base');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/models/ddb/sharded/User');

class TokenUserIdCache extends ChainCacheManagementBase {
  /**
   * Constructor for user ids by token id cache
   *
   * @param {Object} params - cache key generation & expiry related params
   * @param params.tokenId {Number} - token id
   * @param params.shardNumber {Number} - shard number
   * @param params.limit {Number} - limit
   * @param params.page {Number} - page number
   * @param params.lastEvaluatedKey {Object} - lastEvaluatedKey
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenId = params.tokenId;
    oThis.shardNumber = params.shardNumber;
    oThis.limit = params.limit;
    oThis.page = params.page;
    oThis.lastEvaluatedKey = params.lastEvaluatedKey;

    oThis.baseCacheKey = null;

    // Call sub class method to set cache level
    oThis._setCacheLevel();

    // Call sub class method to set base cache level
    oThis._setBaseCacheKey();

    // Call sub class method to set cache expiry using params provided
    oThis._setCacheExpiry();

    // Call sub class method to set cache implementer using params provided
    oThis._setCacheImplementer();
  }

  /**
   * Fetch
   *
   * @return {Promise<*>}
   */
  async fetch() {
    const oThis = this;

    await oThis._setCacheKey();

    return super.fetch();
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
  async _setCacheKey() {
    const oThis = this;

    // cache hit for version
    let versionCacheResponse = await oThis.cacheImplementer.getObject(oThis._versionCacheKey);

    let versionDetail = null;

    if (versionCacheResponse.isSuccess() && versionCacheResponse.data.response != null) {
      versionDetail = versionCacheResponse.data.response;
    }

    if (!versionDetail || versionCacheResponse.isFailure() || versionDetail.limit !== oThis.limit) {
      // set version cache
      versionDetail = {
        v: uuidV4(),
        limit: oThis.limit
      };

      // NOTE: Set this key only on page one. If it's set on every page request. There is a possibility of some data
      // not being included in any page
      if (Number(oThis.page) === 1) {
        await oThis.cacheImplementer.setObject(oThis._versionCacheKey, versionDetail, oThis.cacheExpiry);
      }
    }

    oThis.cacheKey = oThis.baseCacheKey + '_' + versionDetail.v + '_' + oThis.page;
  }

  /**
   * Set base cache key
   *
   * @private
   */
  _setBaseCacheKey() {
    const oThis = this;

    oThis.baseCacheKey = oThis._cacheKeyPrefix() + 'l_cm_c_tui_' + oThis.tokenId.toString();
  }

  /**
   * Set base cache key
   *
   * @private
   */
  get _versionCacheKey() {
    const oThis = this;

    return oThis.baseCacheKey + '_v';
  }

  /**
   * Delete the cache entry
   *
   * @returns {Promise<*>}
   */
  clear() {
    const oThis = this;

    return oThis.cacheImplementer.del(oThis._versionCacheKey);
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   *
   * @return {Number}
   */
  _setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 24 * 60 * 60; // 1 day;

    return oThis.cacheExpiry;
  }

  /**
   * Fetch data from source
   *
   * @return {Promise<*>}
   */
  async fetchDataFromSource() {
    const oThis = this,
      UserModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserModel');

    require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');

    if (!oThis.shardNumber) {
      let TokenShardNumbersCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenShardNumbersCache');
      let tokenShardNumbersCache = new TokenShardNumbersCache({
        tokenId: oThis.tokenId
      });

      let response = await tokenShardNumbersCache.fetch();

      oThis.shardNumber = response.data.user;
    }

    let user = new UserModel({ shardNumber: oThis.shardNumber, consistentRead: oThis.consistentRead });

    let response = await user.getUserIds(oThis.tokenId, oThis.page, oThis.limit, oThis.lastEvaluatedKey);

    return responseHelper.successWithData(response.data);
  }
}

InstanceComposer.registerAsShadowableClass(TokenUserIdCache, coreConstants.icNameSpace, 'TokenUserIdCache');

module.exports = {};
