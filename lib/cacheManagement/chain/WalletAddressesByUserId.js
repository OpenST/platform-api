'use strict';

/**
 * Cache for fetching wallet addresses by userId from device table. Extends base cache.
 *
 * @module lib/cacheManagement/chain/DeviceByUserId
 */

const rootPrefix = '../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  BaseCacheManagement = require(rootPrefix + '/lib/cacheManagement/chain/Base'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/models/ddb/sharded/Device');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

class WalletAddressesByUserId extends BaseCacheManagement {
  /**
   * Constructor for Device by user id cache
   *
   * @param {Object} params - cache key generation & expiry related params
   * @param params.userId {Number} - user id
   * @param params.shardNumber {Number} - shard number
   * @param params.tokenId {Number} - token id
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.userId = params.userId;
    oThis.tokenId = params.tokenId;
    oThis.shardNumber = params.shardNumber;

    // Call sub class method to set cache level
    oThis._setCacheLevel();

    // Call sub class method to set cache key using params provided
    oThis._setCacheKey();

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
   *
   * @return {String}
   */
  _setCacheKey() {
    const oThis = this;

    oThis.cacheKey = oThis._cacheKeyPrefix() + 'l_cm_c_dbui_' + oThis.userId.toString();

    return oThis.cacheKey;
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
   * fetch data from source
   *
   * @return {Result}
   */
  async fetchDataFromSource() {
    const oThis = this,
      DeviceModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceModel');

    if (!oThis.shardNumber) {
      let TokenUSerDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
        tokenUserDetailsCacheObj = new TokenUSerDetailsCache({ tokenId: oThis.tokenId, userIds: [oThis.userId] }),
        cacheFetchRsp = await tokenUserDetailsCacheObj.fetch(),
        userData = cacheFetchRsp.data[oThis.userId];

      oThis.shardNumber = userData['deviceShardNumber'];
    }
    let deviceObj = new DeviceModel({ shardNumber: oThis.shardNumber });

    return deviceObj.getWalletAddresses(oThis.userId);
  }
}

InstanceComposer.registerAsShadowableClass(
  WalletAddressesByUserId,
  coreConstants.icNameSpace,
  'WalletAddressesByUserId'
);

module.exports = {};
