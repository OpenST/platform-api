'use strict';
/**
 * Object that gives getter methods on config strategy fetched for a chain.
 *
 * @module helpers/configStrategy/Object
 */
const rootPrefix = '../..',
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

/**
 * Class for object that gives getter methods on config strategy fetched for a chain.
 *
 * @class
 */
class ConfigStrategyObject {
  /**
   * Constructor for object that gives getter methods on config strategy fetched for a chain.
   *
   * @param configStrategy
   *
   * @constructor
   */
  constructor(configStrategy) {
    const oThis = this;
    oThis.configStrategy = configStrategy;
  }

  get originChainId() {
    const oThis = this;
    return oThis.configStrategy[configStrategyConstants.originGeth].chainId;
  }

  get auxChainId() {
    const oThis = this;
    return (oThis.configStrategy[configStrategyConstants.auxGeth] || {}).chainId;
  }

  get originChainClient() {
    const oThis = this;
    return oThis.configStrategy[configStrategyConstants.originGeth].client;
  }

  get auxChainClient() {
    const oThis = this;
    return oThis.configStrategy[configStrategyConstants.auxGeth].client;
  }

  get elasticSearchConfig() {
    const oThis = this;
    return oThis.configStrategy[configStrategyConstants.elasticSearch];
  }

  extraStorageColumnsForDdb(chainId) {
    const oThis = this;
    if (oThis.auxChainId == chainId) {
      return oThis.extraStorageColumnsForAuxDdb;
    } else if (oThis.originChainId == chainId) {
      return oThis.extraStorageColumnsForOriginDdb;
    } else {
      return {};
    }
  }

  get extraStorageColumnsForAuxDdb() {
    const oThis = this,
      ddbTablePrefix = oThis.configStrategy[configStrategyConstants.constants].auxDdbTablePrefix;
    return {
      [ddbTablePrefix + 'economies']: {
        originContractAddress: {
          shortName: 'oca',
          dataType: 'S'
        },
        simpleStakeAddress: {
          shortName: 'ssa',
          dataType: 'S'
        }
      },
      pendingTransactions: {
        unsettledDebits: {
          shortName: 'ud',
          dataType: 'S'
        },
        eip1077Signature: {
          shortName: 'es',
          dataType: 'S'
        },
        metaProperty: {
          shortName: 'mp',
          dataType: 'S'
        },
        ruleId: {
          shortName: 'rid',
          dataType: 'N'
        },
        status: {
          shortName: 'sts',
          dataType: 'N'
        },
        transferExecutableData: {
          shortName: 'ted',
          dataType: 'S'
        },
        transfers: {
          shortName: 'trs',
          dataType: 'S'
        },
        ruleAddress: {
          shortName: 'ra',
          dataType: 'S'
        },
        sessionKeyNonce: {
          shortName: 'skn',
          dataType: 'S'
        },
        sessionKeyAddress: {
          shortName: 'ska',
          dataType: 'S'
        },
        tokenId: {
          shortName: 'ti',
          dataType: 'N'
        },
        blockNumber: {
          shortName: 'bn',
          dataType: 'N'
        },
        blockTimestamp: {
          shortName: 'bts',
          dataType: 'N'
        },
        erc20Address: {
          shortName: 'ea',
          dataType: 'S'
        },
        toBeSyncedInEs: {
          shortName: 'sie',
          dataType: 'N'
        }
      },
      transactions: {
        metaProperty: {
          shortName: 'mp',
          dataType: 'S'
        },
        ruleId: {
          shortName: 'rid',
          dataType: 'N'
        }
      }
    };
  }

  get extraStorageColumnsForOriginDdb() {
    const oThis = this,
      ddbTablePrefix = oThis.configStrategy[configStrategyConstants.constants].originDdbTablePrefix;
    return {};
  }

  get subEnvDdbTablePrefix() {
    const oThis = this;
    return oThis.configStrategy[configStrategyConstants.constants].subEnvDdbTablePrefix;
  }

  get esConfig() {}

  originChainWsProviders(intent) {
    const oThis = this;
    return oThis.configStrategy[configStrategyConstants.originGeth][intent].wsProviders;
  }

  auxChainWsProviders(intent) {
    const oThis = this;
    return oThis.configStrategy[configStrategyConstants.auxGeth][intent].wsProviders;
  }

  originChainRpcProviders(intent) {
    const oThis = this;
    return oThis.configStrategy[configStrategyConstants.originGeth][intent].rpcProviders;
  }

  auxChainRpcProviders(intent) {
    const oThis = this;
    return oThis.configStrategy[configStrategyConstants.auxGeth][intent].rpcProviders;
  }

  originChainWsProvider(intent) {
    const oThis = this;
    return oThis.configStrategy[configStrategyConstants.originGeth][intent].wsProvider;
  }

  auxChainWsProvider(intent) {
    const oThis = this;
    return oThis.configStrategy[configStrategyConstants.auxGeth][intent].wsProvider;
  }

  originChainRpcProvider(intent) {
    const oThis = this;
    return oThis.configStrategy[configStrategyConstants.originGeth][intent].rpcProvider;
  }

  auxChainRpcProvider(intent) {
    const oThis = this;
    return oThis.configStrategy[configStrategyConstants.auxGeth][intent].rpcProvider;
  }

  originFinalizeAfterBlocks() {
    const oThis = this;
    return oThis.configStrategy[configStrategyConstants.originGeth].finalizeAfterBlocks;
  }

  auxFinalizeAfterBlocks() {
    const oThis = this;
    return oThis.configStrategy[configStrategyConstants.auxGeth].finalizeAfterBlocks;
  }

  chainRpcProviders(chainId, intent) {
    const oThis = this;
    if (oThis.auxChainId == chainId) {
      return oThis.auxChainRpcProviders(intent);
    } else {
      return oThis.originChainRpcProviders(intent);
    }
  }

  chainWsProviders(chainId, intent) {
    const oThis = this;
    if (oThis.auxChainId == chainId) {
      return oThis.auxChainWsProviders(intent);
    } else {
      return oThis.originChainWsProviders(intent);
    }
  }

  chainRpcProvider(chainId, intent) {
    const oThis = this;
    if (oThis.auxChainId == chainId) {
      return oThis.auxChainRpcProvider(intent);
    } else {
      return oThis.originChainRpcProvider(intent);
    }
  }

  chainWsProvider(chainId, intent) {
    const oThis = this;
    if (oThis.auxChainId == chainId) {
      return oThis.auxChainWsProvider(intent);
    } else {
      return oThis.originChainWsProvider(intent);
    }
  }

  chainKind(chainId) {
    const oThis = this;
    if (oThis.auxChainId == chainId) {
      return oThis.auxChainClient;
    } else {
      return oThis.originChainClient;
    }
  }

  chainClient(chainId) {
    const oThis = this;
    if (oThis.auxChainId == chainId) {
      return oThis.auxChainClient;
    } else {
      return oThis.originChainClient;
    }
  }
}

module.exports = ConfigStrategyObject;
