'use strict';

/**
 * Cache for fetching session details by address. Extends base cache.
 *
 * @module lib/cacheManagement/chainMulti/SessionsByAddress
 */

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  CacheManagementChainMultiBase = require(rootPrefix + '/lib/cacheManagement/chainMulti/Base');

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering in instance composer
require(rootPrefix + '/app/models/ddb/sharded/Session');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

class SessionsByAddress extends CacheManagementChainMultiBase {
  /**
   * @constructor
   *
   * @param params
   * @param params.tokenId     {String}  - Token id
   * @param params.userId      {String}  - User id
   * @param params.addresses   {Array}   - addresses
   * @param params.shardNumber {Number}  - shard number
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenId = params.tokenId;
    oThis.userId = params.userId;
    oThis.addresses = params.addresses;
    oThis.shardNumber = params.shardNumber;
    oThis.consistentRead = params.consistentRead;

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
   * set cache key
   *
   * @return {String}
   */
  _setCacheKeys() {
    const oThis = this;

    for (let i = 0; i < oThis.addresses.length; i++) {
      oThis.cacheKeys[oThis._cacheKeyPrefix() + 'cm_cm_sba_' + oThis.userId + '_' + oThis.addresses[i].toLowerCase()] =
        oThis.addresses[i];
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
  async fetchDataFromSource(cacheMissAddresses) {
    const oThis = this;

    if (!oThis.shardNumber) {
      let TokenUserDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
        tokenUserDetailsCacheObj = new TokenUserDetailsCache({ tokenId: oThis.tokenId, userIds: [oThis.userId] }),
        cacheFetchRsp = await tokenUserDetailsCacheObj.fetch(),
        userData = cacheFetchRsp.data[oThis.userId];

      oThis.shardNumber = userData['sessionShardNumber'];
    }

    let SessionModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionModel'),
      sessionObj = new SessionModel({ shardNumber: oThis.shardNumber, consistentRead: oThis.consistentRead });

    logger.debug('==== Fetching data from source ====');

    let response = await sessionObj.getSessionDetails({
      userId: oThis.userId,
      addresses: cacheMissAddresses
    });

    return response;
  }
}

InstanceComposer.registerAsShadowableClass(SessionsByAddress, coreConstants.icNameSpace, 'SessionsByAddressCache');

module.exports = {};
