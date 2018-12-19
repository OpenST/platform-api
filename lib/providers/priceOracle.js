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
class PriceOracleProvider {
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
    const oThis = this,
      priceOracleConfigStrategy = oThis.fetchConfig(chainId);

    return OpenStPriceOracle.getInstance(priceOracleConfigStrategy);
  }

  /**
   * Fetches config strategy based on chainId.
   *
   * @param {Number} chainId
   *
   * @returns {Promise<void>}
   */
  async fetchConfig(chainId) {
    const configMap = await new ConfigStrategyByChainId.getInstance([chainId]);

    const finalConfig = {},
      configStrategy = configMap[chainId];

    let cache = {
      engine: cacheManagementConst.memcached
    };

    finalConfig['chainId'] = chainId;
    finalConfig['rpcProvider'] = configStrategy.auxGeth.readWrite.rpcProvider;
    finalConfig['wsProvider'] = configStrategy.auxGeth.readWrite.wsProvider;
    finalConfig['cache'] = cache;
    finalConfig['priceOracles'] = configStrategy.auxConstants.priceOracles;

    finalConfig['OST_UTILITY_SET_PRICE'] = '';
    finalConfig['OST_UTILITY_DEPLOYER_ADDR'] = '';
    finalConfig['OST_UTILITY_DEPLOYER_PASSPHRASE'] = '';
    finalConfig['OST_UTILITY_OPS_ADDR'] = '';
    finalConfig['OST_UTILITY_OPS_PASSPHRASE'] = '';

    return finalConfig;
  }
}

module.exports = new PriceOracleProvider();
