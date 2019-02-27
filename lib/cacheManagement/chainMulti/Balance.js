'use strict';

/**
 * Cache for fetching balances of a user. Extends base cache.
 *
 * @module lib/cacheManagement/chainMulti/Balance
 */

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  CacheManagementChainMultiBase = require(rootPrefix + '/lib/cacheManagement/chainMulti/Base');

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/app/models/ddb/sharded/Balance');
require(rootPrefix + '/lib/cacheManagement/chainMulti/BalanceShard');

let BATCH_GET_LIMIT = 25;

class Balance extends CacheManagementChainMultiBase {
  /**
   * Constructor for device details cache
   *
   * @param {Object} params
   * @param {Number} params.tokenHolderAddresses  - token holder addresses
   * @param {String} params.erc20Address  - token erc20 address
   * @param {Number} params.chainId  - chain id
   * @param {Number} [params.shardNumber]  - shard number
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenHolderAddresses = params.tokenHolderAddresses;
    oThis.erc20Address = params.erc20Address;
    oThis.chainId = params.chainId;
    oThis.shardNumber = params.shardNumber;

    oThis.sanitizedErc20Address = basicHelper.sanitizeAddress(oThis.erc20Address);

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

    let lowerCaseTokenHolderAddresses;

    for (let i = 0; i < oThis.tokenHolderAddresses.length; i++) {
      lowerCaseTokenHolderAddresses = basicHelper.sanitizeAddress(oThis.tokenHolderAddresses[i]);
      oThis.cacheKeys[
        oThis._cacheKeyPrefix() + 'c_c_b_' + lowerCaseTokenHolderAddresses + '_' + oThis.sanitizedErc20Address
      ] = lowerCaseTokenHolderAddresses;
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
      let BalanceShardCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BalanceShardCache'),
        balanceShardCacheObj = new BalanceShardCache({ erc20Addresses: [oThis.erc20Address], chainId: oThis.chainId }),
        cacheFetchRsp = await balanceShardCacheObj.fetch();

      oThis.shardNumber = cacheFetchRsp.data[oThis.erc20Address];
    }

    if (!oThis.shardNumber) return responseHelper.successWithData({});

    let BalanceModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BalanceModel'),
      balanceObj = new BalanceModel({ shardNumber: oThis.shardNumber });

    logger.debug('==== Fetching data from source ====');

    let balanceFetchRsp = await balanceObj.getBalances({
      tokenHolderAddresses: cacheMissAddresses,
      erc20Address: oThis.erc20Address
    });

    return balanceFetchRsp;
  }
}

InstanceComposer.registerAsShadowableClass(Balance, coreConstants.icNameSpace, 'BalanceCache');

module.exports = {};
