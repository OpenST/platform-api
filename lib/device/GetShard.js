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
   */
  constructor(params) {
    const oThis = this;
    oThis.clientId = params.clientId;
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
   * Get shardNumber using tokenId.
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
    return tokenShardsNumberCache.data[entityKinds.deviceEntityKind];
  }
}

InstanceComposer.registerAsShadowableClass(GetDeviceShard, coreConstants.icNameSpace, 'GetDeviceShard');

module.exports = {};
