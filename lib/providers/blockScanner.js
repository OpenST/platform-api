'use strict';
/**
 * OpenSTStorage Provider
 *
 * @module lib/providers/blockScanner
 */
const OSTBlockScanner = require('@openstfoundation/openst-block-scanner');

const rootPrefix = '../..',
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

    // Assumption: If origin chain is present, then ddb table prefix will be origin chain specific.
    let isOriginChain = false,
      ddbTPHMap,
      globalCacheConfig,
      dynamoDbConfig,
      client;

    for (let chainId in chainCompleteConfigs) {
      let chainFullConfig = chainCompleteConfigs[chainId],
        nodes = [],
        wsProviders = [];

      if (!chainFullConfig) continue;

      ddbTPHMap = chainFullConfig[configStrategyConstants.constants];
      globalCacheConfig = chainFullConfig[configStrategyConstants.globalMemcached];
      dynamoDbConfig = chainFullConfig[configStrategyConstants.dynamodb];

      if (chainFullConfig[configStrategyConstants.originGeth].chainId === +chainId) {
        // Implicit string to int conversion.
        client = chainFullConfig[configStrategyConstants.originGeth].client;
        wsProviders = chainFullConfig[configStrategyConstants.originGeth].readOnly.wsProviders;
        isOriginChain = true;
      } else {
        client = chainFullConfig[configStrategyConstants.originGeth].client;
        wsProviders = chainFullConfig[configStrategyConstants.auxGeth].readOnly.wsProviders;
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
        cache: chainFullConfig[configStrategyConstants.memcached],
        storage: chainFullConfig[configStrategyConstants.dynamodb],
        nodes: nodes
      };
      chainConfigArray.push(chainConfigArrayElement);
    }

    finalConfig.ddbTablePrefix = dynamoDbConfig.tablePrefix;
    finalConfig.cache = globalCacheConfig;
    finalConfig.storage = dynamoDbConfig;
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
