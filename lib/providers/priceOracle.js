'use strict';
/**
 * Price oracle instance provider.
 *
 * @module lib/providers/priceOracle
 */
const rootPrefix = '../..',
  OpenStPriceOracle = require('@openstfoundation/ost-price-oracle'),
  ConfigStrategyByChainId = require(rootPrefix + '/lib/providers/chainConfig'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

/**
 * Class for price oracle provider
 *
 * @class
 */
class CacheProvider {
  /**
   * Constructor for price oracle provider
   *
   * @constructor
   */
  constructor() {}

  /**
   * Get instance of ost-price-oracle.
   *
   * @param {Number} chainId
   *
   * @returns {Object}
   */
  getInstance(chainId) {
    const priceOracleConfigStrategy = {
      "cache": {
        "engine": cacheManagementConst.memcached,
        "servers": coreConstants.SHARED_MEMCACHE_SERVERS,
        "defaultTtl": '86400',
        "consistentBehavior": cacheConsistentBehavior
      }
    };

    return OpenStPriceOracle.getInstance(priceOracleConfigStrategy);
  }

  /**
   * Fetches config strategy based on chainId.
   *
   * @param {Number} chainId
   *
   * @returns {Promise<void>}
   */
  async fetchConfigStrategy(chainId) {
    const configMap = await new ConfigStrategyByChainId.getInstance([chainId]);

    const finalConfigStrategy = {},
      configStrategy = configMap[chainId];

    finalConfigStrategy['OST_UTILITY_GETH_RPC_PROVIDER'] = configStrategy.auxGeth.readWrite.rpcProvider;
    finalConfigStrategy['OST_UTILITY_GETH_WS_PROVIDER'] = configStrategy.auxGeth.readWrite.wsProvider;
    finalConfigStrategy['OST_UTILITY_SET_PRICE'] = '';
    finalConfigStrategy['OST_UTILITY_CHAIN_ID'] = chainId;
    finalConfigStrategy['OST_UTILITY_DEPLOYER_ADDR'] = '';
    finalConfigStrategy['OST_UTILITY_DEPLOYER_PASSPHRASE'] = '';
    finalConfigStrategy['OST_UTILITY_OPS_ADDR'] = '';
    finalConfigStrategy['OST_UTILITY_OPS_PASSPHRASE'] = '';
    finalConfigStrategy['OST_CACHING_ENGINE'] = cacheManagementConst.memcached;
    finalConfigStrategy['OST_UTILITY_PRICE_ORACLES'] = '';


  }

}

module.exports = new CacheProvider();
