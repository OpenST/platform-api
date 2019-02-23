'use strict';

/**
 * Cache for fetching wallet addresses by userId from device table. Extends base cache.
 *
 * @module lib/cacheManagement/chain/UserWalletAddress
 */
const OSTBase = require('@openstfoundation/openst-base'),
  uuidV4 = require('uuid/v4');

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ChainCacheManagementBase = require(rootPrefix + '/lib/cacheManagement/chain/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/models/ddb/sharded/Device');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

class UserWalletAddressCache extends ChainCacheManagementBase {
  /**
   * Constructor for Device by user id cache
   *
   * @param {Object} params - cache key generation & expiry related params
   * @param params.userId {Number} - user id
   * @param params.shardNumber {Number} - shard number
   * @param params.tokenId {Number} - token id
   * @param params.limit {Number} - limit
   * @param params.page {Number} - page number
   * @param params.lastEvaluatedKey {Object} - lastEvaluatedKey
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.userId = params.userId;
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

      await oThis.cacheImplementer.setObject(oThis._versionCacheKey, versionDetail, oThis.cacheExpiry);
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

    oThis.baseCacheKey = oThis._cacheKeyPrefix() + 'l_cm_c_uwa_' + oThis.userId.toString();
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
      DeviceModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceModel');

    if (!oThis.shardNumber) {
      let TokenUSerDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
        tokenUserDetailsCache = new TokenUSerDetailsCache({ tokenId: oThis.tokenId, userIds: [oThis.userId] }),
        cacheFetchRsp = await tokenUserDetailsCache.fetch(),
        userData = cacheFetchRsp.data[oThis.userId];

      if (!CommonValidators.validateObject(userData)) {
        return Promise.reject(
          responseHelper.paramValidationError({
            internal_error_identifier: 'l_cm_c_uwa_1',
            api_error_identifier: 'resource_not_found',
            params_error_identifiers: ['user_not_found'],
            debug_options: {}
          })
        );
      }

      oThis.shardNumber = userData.deviceShardNumber;
    }

    let deviceObj = new DeviceModel({ shardNumber: oThis.shardNumber });
    return deviceObj.getWalletAddresses(oThis.userId, oThis.page, oThis.limit, oThis.lastEvaluatedKey);
  }
}

InstanceComposer.registerAsShadowableClass(UserWalletAddressCache, coreConstants.icNameSpace, 'UserWalletAddressCache');

module.exports = {};
