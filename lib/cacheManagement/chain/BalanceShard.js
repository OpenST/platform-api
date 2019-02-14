'use strict';

/**
 * Cache for fetching balance shard for an erc20 address. Extends base cache.
 *
 * @module lib/cacheManagement/chain/BalanceShard
 */

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  entityConst = require(rootPrefix + '/lib/globalConstant/shard'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  BaseCacheManagement = require(rootPrefix + '/lib/cacheManagement/chain/Base'),
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress');

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');

class BalanceShard extends BaseCacheManagement {
  /**
   * Constructor for balance shard number cache
   *
   * @param {Object} params - cache key generation & expiry related params
   * @param params.erc20Address {String} - erc20 contract address of token
   * @param params.chainId      {Number} - chain id
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.erc20Address = params.erc20Address;
    oThis.chainId = params.chainId;

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

    oThis.cacheKey = oThis._cacheKeyPrefix() + 'c_c_bs_' + oThis.erc20Address.toLowerCase();

    return oThis.cacheKey;
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   *
   * @return {Number}
   */
  _setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 1 * 24 * 60 * 60; // 1 days;

    return oThis.cacheExpiry;
  }

  /**
   * fetch data from source
   *
   * @return {Result}
   */
  async fetchDataFromSource() {
    const oThis = this,
      tokenAddressObj = new TokenAddressModel({}),
      TokenShardNumbersCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenShardNumbersCache');

    let tokenAddressRsp = await tokenAddressObj.getTokenIdByAddress({
      address: oThis.erc20Address,
      chainId: oThis.chainId
    });

    oThis.tokenId = tokenAddressRsp.data.token_id;

    // Cache empty object if no token
    if (!oThis.tokenId) {
      return responseHelper.successWithData({});
    }

    // Cache empty object if not UBT
    if (tokenAddressRsp.data.kind != tokenAddressObj.invertedKinds[tokenAddressConstants.utilityBrandedTokenContract]) {
      return responseHelper.successWithData({});
    }

    let response = await new TokenShardNumbersCache({ tokenId: oThis.tokenId }).fetch();

    let balanceShardNumber = response.data[entityConst.balanceEntityKind];

    if (!balanceShardNumber) {
      return responseHelper.successWithData({});
    }

    return responseHelper.successWithData({ shardNumber: balanceShardNumber });
  }
}

InstanceComposer.registerAsShadowableClass(BalanceShard, coreConstants.icNameSpace, 'BalanceShardCache');

module.exports = {};
