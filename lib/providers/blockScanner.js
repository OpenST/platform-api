'use strict';
/**
 * OpenSTStorage Provider
 *
 * @module lib/providers/blockScanner
 */
const rootPrefix = '../..',
  OSTBlockScanner = require("@openstfoundation/openst-block-scanner"),
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

  async _tempGetBlockScannerConfigStrategy(chainIds) {
    return {
      "ddbTablePrefix": "de_ma_",
      "cache": {
        "engine": "memcached",
        "servers": [
          "127.0.0.1:11211"
        ],
        "defaultTtl": 36000,
        "consistentBehavior": 1
      },
      "storage": {
        "endpoint": "http://localhost:8000",
        "region": "localhost",
        "apiKey": "X",
        "apiSecret": "X",
        "apiVersion": "2012-08-10",
        "enableSsl": "0",
        "enableLogging": "0",
        "enableAutoscaling": "0",
        "autoScaling": {
          "endpoint": "http://localhost:8000",
          "region": "localhost",
          "apiKey": "X",
          "apiSecret": "X",
          "apiVersion": "2012-08-10",
          "enableSsl": "0"
        }
      },
      "chains": [
        {
          "chainId": 1000,
          "cache": {
            "engine": "memcached",
            "servers": [
              "127.0.0.1:11211"
            ],
            "defaultTtl": 36000
          },
          "storage": {
            "endpoint": "http://localhost:8000",
            "region": "localhost",
            "apiKey": "X",
            "apiSecret": "X",
            "apiVersion": "2012-08-10",
            "enableSsl": "0",
            "enableLogging": "0",
            "enableAutoscaling": "0",
            "autoScaling": {
              "endpoint": "http://localhost:8000",
              "region": "localhost",
              "apiKey": "X",
              "apiSecret": "X",
              "apiVersion": "2012-08-10",
              "enableSsl": "0"
            }
          },
          "nodes": [
            {
              "client": "geth",
              "wsEndpoint": "ws://127.0.0.2:8546",
              "rpcEndpoint": "http://127.0.0.2:8545"
            }
          ]
        },
        {
          "chainId": 2001,
          "cache": {
            "engine": "memcached",
            "servers": [
              "127.0.0.1:11211"
            ],
            "defaultTtl": 36000
          },
          "storage": {
            "endpoint": "http://localhost:8000",
            "region": "localhost",
            "apiKey": "X",
            "apiSecret": "X",
            "apiVersion": "2012-08-10",
            "enableSsl": "0",
            "enableLogging": "0",
            "enableAutoscaling": "0",
            "autoScaling": {
              "endpoint": "http://localhost:8000",
              "region": "localhost",
              "apiKey": "X",
              "apiSecret": "X",
              "apiVersion": "2012-08-10",
              "enableSsl": "0"
            }
          },
          "nodes": [
            {
              "client": "geth",
              "wsEndpoint": "ws://127.0.0.1:8546",
              "rpcEndpoint": "http://127.0.0.1:8545"
            }
          ]
        }
      ],
      "extraStorageColumns": {
        "chains": {
          "chainName": {
            "shortName": "cnm",
            "dataType": "S"
          }
        },
        "blocks":{
          "totalTokenTransfers": {
            "shortName": "ttt",
            "dataType": "N"
          }
        }
      }
    }
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

    // assumption - if origin chain is present, then ddb table prefix will be origin chain specific.
    let isOriginChain = false,
      ddbTPHMap,
      globalCacheConfig,
      globalDynamodbConfig;

    for (let chainId in chainCompleteConfigs) {
      let chainFullConfig = chainCompleteConfigs[chainId],
        nodes = [],
        wsProviders = [];

      ddbTPHMap = chainFullConfig[configStrategyConstants.constants];
      globalCacheConfig = chainFullConfig[configStrategyConstants.globalMemcached];
      globalDynamodbConfig = chainFullConfig[configStrategyConstants.globalDynamodb];

      if(chainFullConfig[configStrategyConstants.constants].originChainId === +chainId) { // Implicit string to int conversion.
        wsProviders = chainFullConfig[configStrategyConstants.originGeth].readOnly.wsProviders;
        isOriginChain = true;
      } else {
        wsProviders = chainFullConfig[configStrategyConstants.auxGeth].readOnly.wsProviders;
      }

      for(let index = 0; index < wsProviders.length; index ++) {
        nodes.push({
          "client": chainFullConfig[configStrategyConstants.auxGeth].client,
          "wsEndpoint": wsProviders[index ],
          "rpcEndpoint": null
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
    console.log(ddbTPHMap);
    if (isOriginChain) {
      return ddbTPHMap.originDdbTablePrefix;
    } else {
      return ddbTPHMap.auxDdbTablePrefix;
    }
  }
}

module.exports = new BlockScannerProvider();
