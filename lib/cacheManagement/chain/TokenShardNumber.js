'use strict';

/**
 * Cache for fetching shard numbers for a token. Extends base cache.
 *
 * @module lib/cacheManagement/chain/TokenShardNumber
 */
const OSTBase = require('@ostdotcom/base');

const rootPrefix = '../../..',
  ChainCacheManagementBase = require(rootPrefix + '/lib/cacheManagement/chain/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  entityConst = require(rootPrefix + '/lib/globalConstant/shard'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

const InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/app/models/ddb/shared/ShardByToken');

class TokenShardNumbers extends ChainCacheManagementBase {
  /**
   * Constructor for token shard numbers cache
   *
   * @param {Object} params - cache key generation & expiry related params
   * @param params.tokenId {Number} - token id
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenId = params.tokenId;

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

    oThis.cacheKey = oThis._cacheKeyPrefix() + 'c_t_s_n_' + oThis.tokenId.toString();

    return oThis.cacheKey;
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   *
   * @return {Number}
   */
  _setCacheExpiry() {
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
      ShardsByTokens = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardByTokenModel');
    let shardByTokens = new ShardsByTokens({});

    let entityKinds = Object.keys(entityConst.invertedEntityKinds);

    let response = await shardByTokens.getShardNumbers({
      tokenId: oThis.tokenId,
      entityKinds: entityKinds
    });

    return responseHelper.successWithData(response.data);
  }
}

InstanceComposer.registerAsShadowableClass(TokenShardNumbers, coreConstants.icNameSpace, 'TokenShardNumbersCache');

module.exports = {};
