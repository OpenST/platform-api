'use strict';

/**
 * Cache for fetching session addresses by userId from sessions table. Extends base cache.
 *
 * @module lib/cacheManagement/chain/SessionAddressesByUserId
 */

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  BaseCacheManagement = require(rootPrefix + '/lib/cacheManagement/chain/Base');

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/models/ddb/sharded/Session');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

class SessionAddressesByUserId extends BaseCacheManagement {
  /**
   * Constructor for sessions by user id cache
   *
   * @param params              {Object} - cache key generation & expiry related params
   * @param params.userId       {Number} - user id
   * @param params.tokenId      {Number} - token id
   * @param params.limit      {Number} - limit
   * @param params.shardNumber  {Number} - session shard number
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

    oThis.cacheKey = oThis._cacheKeyPrefix() + 'l_cm_c_sabui_' + oThis.userId.toString();

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
      SessionModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionModel');

    if (!oThis.shardNumber) {
      let TokenUserDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
        tokenUserDetailsCacheObj = new TokenUserDetailsCache({ tokenId: oThis.tokenId, userIds: [oThis.userId] }),
        cacheFetchRsp = await tokenUserDetailsCacheObj.fetch(),
        userData = cacheFetchRsp.data[oThis.userId];

      oThis.shardNumber = userData['sessionShardNumber'];
    }

    let sessionObj = new SessionModel({ shardNumber: oThis.shardNumber });

    return sessionObj.getSessionsAddresses(oThis.userId, oThis.limit);
  }
}

InstanceComposer.registerAsShadowableClass(
  SessionAddressesByUserId,
  coreConstants.icNameSpace,
  'SessionAddressesByUserIdCache'
);

module.exports = {};
