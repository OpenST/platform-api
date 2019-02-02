'use strict';

/**
 * This module fetch device shard.
 *
 * @module lib/device/GetShard
 */
const rootPrefix = '../..',
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  entityKinds = require(rootPrefix + '/lib/globalConstant/shard'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  TokenCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

/**
 * Class to get device shard number.
 *
 * @class GetDeviceShard
 */
class GetDeviceShard {
  /**
   *
   * @param {Object} params
   * @param {Integer} params.clientId
   * @param {String} params.userId
   */
  constructor(params) {
    const oThis = this;
    oThis.clientId = params.clientId;
    oThis.userId = params.userId;
  }

  async perform() {
    const oThis = this;

    return await oThis._getShardNumber();
  }

  /**
   * Get tokenId from tokens cache using clientId.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _getTokenId() {
    const oThis = this,
      tokenCache = new TokenCache({ clientId: oThis.clientId });

    let tokenCacheResponse = await tokenCache.fetch();
    logger.debug('tokenCacheResponse ========', tokenCacheResponse);
    return tokenCacheResponse.data.id;
  }

  /**
   * Get shardNumber.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _getShardNumber() {
    const oThis = this,
      tokenId = await oThis._getTokenId(),
      TokenShardNumbersCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenShardNumbersCache'),
      tokenShardsNumberCache = await new TokenShardNumbersCache({ tokenId: tokenId }).fetch();

    logger.debug('tokenShardsNumberCache ========', tokenShardsNumberCache);

    let userShardNumber = tokenShardsNumberCache.data[entityKinds.userEntityKind],
      TokenUserDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCache = await new TokenUserDetailsCache({
        tokenId: tokenId,
        userIds: [oThis.userId],
        shardNumber: userShardNumber
      }).fetch();

    logger.debug('tokenUserDetailsCache ========', tokenUserDetailsCache);

    return tokenUserDetailsCache.data.deviceShardNumber;
  }
}

InstanceComposer.registerAsShadowableClass(GetDeviceShard, coreConstants.icNameSpace, 'GetDeviceShard');

module.exports = {};
