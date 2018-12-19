'use strict';
/**
 * OpenSTStorage Provider
 *
 * @module lib/providers/blockScanner
 */
const rootPrefix = '../..',
  OSTBlockScanner = require('@openstfoundation/openst-block-scanner'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/formatter/config');

/**
 * Class for block scanner provider
 *
 * @class
 */
class BlockScannerProvider {
  /**
   * Constructor for block scanner provider
   *
   * @constructor
   */
  constructor() {}

  /**
   * Get instance of block scanner
   *
   * @param {Array} chainIds: array of chain ids
   *
   * @returns {*}
   */
  async getInstance(chainIds) {
    const oThis = this;

    return new OSTBlockScanner(await oThis._getBlockScannerConfigStrategy(chainIds));
  }

  /**
   * Get block scanner config strategy
   *
   * @param {Array} chainIds: array of chain ids
   *
   * @private
   */
  async _getBlockScannerConfigStrategy(chainIds) {
    const oThis = this,
      finalConfig = {},
      chainConfigArray = [];

    let chainCompleteConfigs = await chainConfigProvider.getFor(chainIds);

    console.log('chainCompleteConfigs---==========----------------', chainCompleteConfigs);
    // Assumption: If origin chain is present, then ddb table prefix will be origin chain specific.
    let isOriginChain = false,
      ddbTPHMap,
      globalCacheConfig,
      globalDynamodbConfig;

    for (let chainId in chainCompleteConfigs) {
      let chainFullConfig = chainCompleteConfigs[chainId],
        nodes = [],
        wsProviders = [];

      if (!chainFullConfig) continue;

      ddbTPHMap = chainFullConfig[configStrategyConstants.constants];
      globalCacheConfig = chainFullConfig[configStrategyConstants.globalMemcached];
      globalDynamodbConfig = chainFullConfig[configStrategyConstants.globalDynamodb];

      if (chainFullConfig[configStrategyConstants.constants].originChainId === +chainId) {
        // Implicit string to int conversion.
        wsProviders = chainFullConfig[configStrategyConstants.originGeth].readOnly.wsProviders;
        isOriginChain = true;
      } else {
        console.log('chainFullConfig------------', chainFullConfig);
        wsProviders = chainFullConfig[configStrategyConstants.auxGeth].readOnly.wsProviders;
      }

      for (let index = 0; index < wsProviders.length; index++) {
        nodes.push({
          client: chainFullConfig[configStrategyConstants.auxGeth].client,
          wsEndpoint: wsProviders[index],
          rpcEndpoint: null
        });
      }

      let chainConfigArrayElement = {
        chainId: chainId,
        cache: chainFullConfig[configStrategyConstants.memcached],
        storage: chainFullConfig[configStrategyConstants.dynamodb],
        nodes: nodes
      };
      chainConfigArray.push(chainConfigArrayElement);
    }

    let ddbTablePrefix = oThis._ddbTablePrefix(ddbTPHMap, isOriginChain);

    finalConfig.ddbTablePrefix = ddbTablePrefix;
    finalConfig.cache = globalCacheConfig;
    finalConfig.storage = globalDynamodbConfig;
    finalConfig.chains = chainConfigArray;

    return finalConfig;
  }

  /**
   * Dynamodb table prefix
   *
   * @param {Object} ddbTPHMap
   * @param {Boolean} isOriginChain
   *
   * @returns {String}
   *
   * @private
   */
  _ddbTablePrefix(ddbTPHMap, isOriginChain) {
    if (isOriginChain) {
      return ddbTPHMap.originDdbTablePrefix;
    } else {
      return ddbTPHMap.auxDdbTablePrefix;
    }
  }
}

module.exports = new BlockScannerProvider();
