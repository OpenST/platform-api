'use strict';

/*
 * Cache for fetching chain config strategy ids. Extends base cache.
 */

const rootPrefix = '../..',
  BaseSharedCacheManagement = require(rootPrefix + '/lib/sharedCacheManagement/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

require(rootPrefix + '/app/models/ddb/shared/Shard');

const InstanceComposer = OSTBase.InstanceComposer;

class AvailableShards extends BaseSharedCacheManagement {
  /**
   * Constructor for available shards cache
   *
   * @param {Object} params - cache key generation & expiry related params
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.cacheType = cacheManagementConst.sharedMemcached;
    oThis.consistentBehavior = '1';
    oThis.useObject = true;

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

    oThis.cacheKey = oThis._sharedCacheKeyPrefix() + 'c_a_s';

    return oThis.cacheKey;
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   *
   * @return {Number}
   */
  setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 3 * 24 * 60 * 60; // 3 days;

    return oThis.cacheExpiry;
  }

  /**
   * fetch data from source
   *
   * @return {Result}
   */
  async fetchDataFromSource() {
    const oThis = this,
      ShardsModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardModel');
    let shards = new ShardsModel({});

    let response = await shards.getAvailableShards();

    return responseHelper.successWithData(response.data);
  }
}

InstanceComposer.registerAsShadowableClass(AvailableShards, coreConstants.icNameSpace, 'AvailableShardsCache');

module.exports = AvailableShards;
