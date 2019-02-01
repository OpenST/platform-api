'use strict';

/*
 * Cache for fetching details of users. Extends base cache.
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  CacheManagementChainMultiBase = require(rootPrefix + '/lib/cacheManagement/chainMulti/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

require(rootPrefix + '/app/models/ddb/sharded/User');

class TokenUserDetailsCache extends CacheManagementChainMultiBase {
  /**
   * Constructor
   *
   * @param {Object} params - cache key generation & expiry related params
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenId = params.tokenId;
    oThis.userIds = params.userIds;
    oThis.shardNumber = params.shardNumber;

    // Call sub class method to set cache level
    oThis._setCacheLevel();

    // Call sub class method to set cache key using params provided
    oThis._setCacheKeys();

    oThis._setInvertedCacheKeys();

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
   * set cache keys
   */
  _setCacheKeys() {
    const oThis = this;

    for (let i = 0; i < oThis.userIds.length; i++) {
      oThis.cacheKeys[oThis._cacheKeyPrefix() + 'cmm_tud_' + oThis.tokenId + '_' + oThis.userIds[i]] = oThis.userIds[i];
    }
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   */
  _setCacheExpiry() {
    const oThis = this;
    oThis.cacheExpiry = 3 * 24 * 60 * 60; // 72 hours ;
  }

  /**
   * fetch data from source
   *
   * @return {Result}
   */
  async fetchDataFromSource(cacheMissIds) {
    const oThis = this,
      UserModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserModel');

    require(rootPrefix + '/lib/cacheManagement/TokenShardNumbers');

    if (!oThis.shardNumber) {
      let TokenShardNumbersCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenShardNumbersCache');
      let tokenShardNumbersCache = new TokenShardNumbersCache({
        tokenId: oThis.tokenId
      });

      let response = await tokenShardNumbersCache.fetch();

      oThis.shardNumber = response.data.user;
    }

    let user = new UserModel({ shardNumber: oThis.shardNumber });

    let response = await user.getUsersByIds({
      tokenId: oThis.tokenId,
      userIds: cacheMissIds
    });

    return responseHelper.successWithData(response.data);
  }
}

InstanceComposer.registerAsShadowableClass(TokenUserDetailsCache, coreConstants.icNameSpace, 'TokenUserDetailsCache');

module.exports = TokenUserDetailsCache;
