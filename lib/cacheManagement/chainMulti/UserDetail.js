'use strict';

/**
 * Cache for fetching details of users. Extends base cache.
 *
 * @module lib/cacheManagement/chainMulti/UserDetail
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  CacheManagementChainMultiBase = require(rootPrefix + '/lib/cacheManagement/chainMulti/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

require(rootPrefix + '/app/models/ddb/sharded/User');

class UserDetail extends CacheManagementChainMultiBase {
  /**
   * Constructor
   *
   * @param {Object} params - cache key generation & expiry related params
   * @param {Array} params.tokenHolderAddresses
   * @param {Number} params.tokenId
   * @param {Number} [params.shardNumber]
   * @param {Number} [params.consistentRead]
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenHolderAddresses = params.tokenHolderAddresses;
    oThis.tokenId = params.tokenId;
    oThis.shardNumber = params.shardNumber;
    oThis.consistentRead = params.consistentRead;

    // Call sub class method to set cache level
    oThis._setCacheLevel();

    // Call sub class method to set cache key using params provided
    oThis._setCacheKeys();

    // Set inverted cache keys
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
   * Set cache keys
   *
   * @private
   */
  _setCacheKeys() {
    const oThis = this;

    for (let i = 0; i < oThis.tokenHolderAddresses.length; i++) {
      oThis.cacheKeys[oThis._cacheKeyPrefix() + 'cm_ud_' + oThis.tokenHolderAddresses[i].toLowerCase()] =
        oThis.tokenHolderAddresses[i];
    }
  }

  /**
   * Set cache expiry in oThis.cacheExpiry and return it
   *
   * @private
   */
  _setCacheExpiry() {
    const oThis = this;
    oThis.cacheExpiry = 3 * 24 * 60 * 60; // 72 hours ;
  }

  /**
   * Fetch data from source
   *
   * @return {Result}
   */
  async fetchDataFromSource(cacheMissAddresses) {
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

    let response = await user.getUserIdsByTokenHolderAddresses({
      tokenHolderAddresses: cacheMissAddresses
    });

    return responseHelper.successWithData(response.data);
  }
}

InstanceComposer.registerAsShadowableClass(UserDetail, coreConstants.icNameSpace, 'UserDetailCache');

module.exports = {};
