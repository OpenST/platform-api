'use strict';

/**
 * Cache for fetching balance shards for an erc20 addresses. Extends base cache.
 *
 * @module lib/cacheManagement/chainMulti/BalanceShard
 */

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  entityConst = require(rootPrefix + '/lib/globalConstant/shard'),
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  CacheManagementChainMultiBase = require(rootPrefix + '/lib/cacheManagement/chainMulti/Base');

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');

class BalanceShard extends CacheManagementChainMultiBase {
  /**
   * Constructor for device details cache
   *
   * @param {Object} params
   * @param {Array} params.erc20Addresses  - erc20 addresses
   * @param {Number} params.chainId  - chain id
   * @param {Number} [params.shardNumber]  - shard number
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.erc20Addresses = params.erc20Addresses;
    oThis.chainId = params.chainId;

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

    let lowercaseErc20Address;

    for (let i = 0; i < oThis.erc20Addresses.length; i++) {
      lowercaseErc20Address = oThis.erc20Addresses[i].toLowerCase();
      oThis.cacheKeys[oThis._cacheKeyPrefix() + 'c_cm_bs_' + lowercaseErc20Address] = lowercaseErc20Address;
    }
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   */
  _setCacheExpiry() {
    const oThis = this;
    oThis.cacheExpiry = 1 * 24 * 60 * 60; // 1 days;
  }

  /**
   * fetch data from source
   *
   * @return {Result}
   */
  async fetchDataFromSource(cacheMissAddresses) {
    const oThis = this,
      tokenAddressObj = new TokenAddressModel({}),
      TokenShardNumbersCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenShardNumbersCache');

    let tokenAddressRsp = await tokenAddressObj.getTokenIdByAddress({
      addresses: oThis.erc20Addresses,
      chainId: oThis.chainId
    });

    let tokenAddressData = tokenAddressRsp.data;

    let result = {},
      tokenIdToAddressMap = {},
      promiseArray = [];

    for (let address in tokenAddressData) {
      let tokenData = tokenAddressData[address];

      if (tokenData.kind != tokenAddressObj.invertedKinds[tokenAddressConstants.utilityBrandedTokenContract]) {
        continue;
      }

      tokenIdToAddressMap[tokenData.token_id] = tokenData.address;

      promiseArray.push(
        new TokenShardNumbersCache({ tokenId: tokenData.token_id }).fetch().then(function(resp) {
          result[tokenIdToAddressMap[tokenData.token_id]] = resp.data[entityConst.balanceEntityKind];
        })
      );
    }

    await Promise.all(promiseArray);

    return responseHelper.successWithData(result);
  }

  /**
   * Validate data to set.
   *
   * @param dataToSet
   * @returns {*}
   */
  validateDataToSet(dataToSet) {
    return dataToSet;
  }
}

InstanceComposer.registerAsShadowableClass(BalanceShard, coreConstants.icNameSpace, 'BalanceShardCache');

module.exports = {};
