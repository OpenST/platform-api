'use strict';
/**
 * OpenSTStorage Provider
 *
 * @module lib/providers/blockScanner
 */
const OSTBlockScanner = require('@ostdotcom/ost-block-scanner');

const rootPrefix = '../..',
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
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
  constructor() {
    const oThis = this;

    oThis.chainSpecificFinalizeAfterBlocks = {};
  }

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
   * Get finalize after block for specified chain id
   *
   * @param {Number} chainId: chain id
   *
   * @returns {number}
   */
  getFinalizeAfterBlockFor(chainId) {
    const oThis = this;

    return oThis.chainSpecificFinalizeAfterBlocks[chainId] || 24;
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
      chainConfigArray = [],
      extraColumnsConfig = {};

    let chainCompleteConfigs = await chainConfigProvider.getFor(chainIds);

    // Assumption: If origin chain is present, then ddb table prefix will be origin chain specific.
    let isOriginChain = false,
      ddbTPHMap,
      globalCacheConfig,
      globalDynamoDbConfig,
      client;

    for (let chainId in chainCompleteConfigs) {
      let chainFullConfig = chainCompleteConfigs[chainId],
        nodes = [],
        wsProviders = [],
        configStrategyObj = new ConfigStrategyObject(chainFullConfig);

      if (!chainFullConfig) continue;

      ddbTPHMap = chainFullConfig[configStrategyConstants.constants];
      globalCacheConfig = chainFullConfig[configStrategyConstants.globalMemcached];
      globalDynamoDbConfig = chainFullConfig[configStrategyConstants.globalDynamodb];

      if (configStrategyObj.originChainId === +chainId) {
        // Implicit string to int conversion.
        client = configStrategyObj.originChainClient;
        wsProviders = configStrategyObj.originChainWsProviders(configStrategyConstants.gethReadOnly);
        oThis.chainSpecificFinalizeAfterBlocks[chainId] = configStrategyObj.originFinalizeAfterBlocks();
        isOriginChain = true;
      } else {
        client = configStrategyObj.auxChainClient;
        wsProviders = configStrategyObj.auxChainWsProviders(configStrategyConstants.gethReadOnly);
        oThis.chainSpecificFinalizeAfterBlocks[chainId] = configStrategyObj.auxFinalizeAfterBlocks();
      }

      for (let index = 0; index < wsProviders.length; index++) {
        nodes.push({
          client: client,
          wsEndpoint: wsProviders[index],
          rpcEndpoint: null
        });
      }

      let chainConfigArrayElement = {
        chainId: chainId,
        cache: oThis._getCacheConfigForChain(chainFullConfig, isOriginChain), // Conditional
        storage: oThis._getDynamoConfigForChain(chainFullConfig, isOriginChain), // Conditional
        nodes: nodes
      };
      chainConfigArray.push(chainConfigArrayElement);

      Object.assign(extraColumnsConfig, configStrategyObj.extraStorageColumnsForDdb(chainId));
    }

    finalConfig.ddbTablePrefix = oThis._ddbTablePrefix(ddbTPHMap, isOriginChain);
    finalConfig.cache = globalCacheConfig;
    finalConfig.storage = globalDynamoDbConfig; // Global always.
    finalConfig.chains = chainConfigArray;
    finalConfig.extraStorageColumns = extraColumnsConfig;

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

  /**
   * If chain is origin then chain cache config will be originMemcached
   * else chain specific memcached.
   *
   * @param {Object} chainFullConfig
   * @param {Boolean} isOriginChain
   *
   * @returns {String}
   *
   * @private
   */
  _getCacheConfigForChain(chainFullConfig, isOriginChain) {
    if (isOriginChain) {
      return chainFullConfig.originMemcached;
    } else {
      return chainFullConfig[configStrategyConstants.memcached];
    }
  }
  /**
   * If chain is origin then chain dynamo config will be originDynamodb
   * else chain specific memcached.
   *
   * @param {Object} chainFullConfig
   * @param {Boolean} isOriginChain
   *
   * @returns {String}
   *
   * @private
   */
  _getDynamoConfigForChain(chainFullConfig, isOriginChain) {
    if (isOriginChain) {
      return chainFullConfig.originDynamodb;
    } else {
      return chainFullConfig[configStrategyConstants.dynamodb];
    }
  }
}

module.exports = new BlockScannerProvider();
