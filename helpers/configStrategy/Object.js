'use strict';
/**
 * Object that gives getter methods on config strategy fetched for a chain
 *
 * @module helpers/configStrategy/Object
 */
const rootPrefix = '../..',
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  basicHelper = require(rootPrefix + '/helpers/basic');

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

  /**
   * GETH related methods / properties - START
   */
  originChainConfig() {
    const oThis = this;
    return oThis.configStrategy[configStrategyConstants.originGeth];
  }

  auxChainConfig() {
    const oThis = this;
    return oThis.configStrategy[configStrategyConstants.auxGeth];
  }

  isOriginChain(chainId) {
    const oThis = this;

    if (!oThis.originChainConfig()) return false;

    return oThis.originChainId == chainId;
  }

  isAuxChain(chainId) {
    const oThis = this;

    if (!oThis.auxChainConfig()) return false;

    return oThis.auxChainId == chainId;
  }

  get originChainId() {
    const oThis = this;
    return oThis.originChainConfig().chainId;
  }

  get auxChainId() {
    const oThis = this;
    return oThis.auxChainConfig().chainId;
  }

  get originChainClient() {
    const oThis = this;
    return oThis.originChainConfig().client;
  }

  get auxChainClient() {
    const oThis = this;
    return oThis.auxChainConfig().client;
  }

  originChainWsProviders(intent) {
    const oThis = this;
    let wsProviders = oThis.originChainConfig()[intent].wsProviders;
    return basicHelper.shuffleArray(wsProviders);
  }

  auxChainWsProviders(intent) {
    const oThis = this;
    let wsProviders = oThis.auxChainConfig()[intent].wsProviders;
    return basicHelper.shuffleArray(wsProviders);
  }

  unShuffledAuxChainWsProviders(intent) {
    const oThis = this;
    return oThis.auxChainConfig()[intent].wsProviders;
  }

  originChainRpcProviders(intent) {
    const oThis = this;
    return oThis.originChainConfig()[intent].rpcProviders;
  }

  auxChainRpcProviders(intent) {
    const oThis = this;
    return oThis.auxChainConfig()[intent].rpcProviders;
  }

  originChainWsProvider(intent) {
    const oThis = this;

    let providers = oThis.originChainWsProviders(intent),
      shuffledProviders = basicHelper.shuffleArray(providers);

    return shuffledProviders[0];
  }

  auxChainWsProvider(intent) {
    const oThis = this;

    let providers = oThis.auxChainWsProviders(intent),
      shuffledProviders = basicHelper.shuffleArray(providers);

    return shuffledProviders[0];
  }

  originChainRpcProvider(intent) {
    const oThis = this;

    let providers = oThis.originChainRpcProviders(intent),
      shuffledProviders = basicHelper.shuffleArray(providers);

    return shuffledProviders[0];
  }

  auxChainRpcProvider(intent) {
    const oThis = this;

    let providers = oThis.auxChainRpcProviders(intent),
      shuffledProviders = basicHelper.shuffleArray(providers);

    return shuffledProviders[0];
  }

  originFinalizeAfterBlocks() {
    const oThis = this;
    return oThis.originChainConfig().finalizeAfterBlocks;
  }

  auxFinalizeAfterBlocks() {
    const oThis = this;
    return oThis.auxChainConfig().finalizeAfterBlocks;
  }

  chainRpcProviders(chainId, intent) {
    const oThis = this;
    if (oThis.isAuxChain(chainId)) {
      return oThis.auxChainRpcProviders(intent);
    } else if (oThis.isOriginChain(chainId)) {
      return oThis.originChainRpcProviders(intent);
    } else {
      throw 'Chain rpc providers not found for chain id: ' + chainId;
    }
  }

  chainWsProviders(chainId, intent) {
    const oThis = this;
    if (oThis.isAuxChain(chainId)) {
      return oThis.auxChainWsProviders(intent);
    } else if (oThis.isOriginChain(chainId)) {
      return oThis.originChainWsProviders(intent);
    } else {
      throw 'Chain ws providers not found for chain id: ' + chainId;
    }
  }

  chainRpcProvider(chainId, intent) {
    const oThis = this;
    if (oThis.isAuxChain(chainId)) {
      return oThis.auxChainRpcProvider(intent);
    } else if (oThis.isOriginChain(chainId)) {
      return oThis.originChainRpcProvider(intent);
    } else {
      throw 'Chain rpc provider not found for chain id: ' + chainId;
    }
  }

  chainWsProvider(chainId, intent) {
    const oThis = this;
    if (oThis.isAuxChain(chainId)) {
      return oThis.auxChainWsProvider(intent);
    } else if (oThis.isOriginChain(chainId)) {
      return oThis.originChainWsProvider(intent);
    } else {
      throw 'Chain ws provider not found for chain id: ' + chainId;
    }
  }

  chainKind(chainId) {
    const oThis = this;
    if (oThis.isAuxChain(chainId)) {
      return oThis.auxChainClient;
    } else if (oThis.isOriginChain(chainId)) {
      return oThis.originChainClient;
    } else {
      throw 'Chain kind not found for chain id: ' + chainId;
    }
  }

  chainClient(chainId) {
    const oThis = this;
    if (oThis.isAuxChain(chainId)) {
      return oThis.auxChainClient;
    } else if (oThis.isOriginChain(chainId)) {
      return oThis.originChainClient;
    } else {
      throw 'Chain client not found for chain id: ' + chainId;
    }
  }

  /**
   * GETH related methods / properties - END
   */

  get elasticSearchConfig() {
    const oThis = this;
    return oThis.configStrategy[configStrategyConstants.elasticSearch];
  }

  get extraStorageColumnsForOriginDdb() {
    const oThis = this;
    return {
      pendingTransactions: oThis.pendingTransactionsExtraConfig,
      transactions: oThis.transactionsExtraConfig
    };
  }

  extraStorageColumnsForDdb(chainId) {
    const oThis = this;
    if (oThis.isAuxChain(chainId)) {
      return oThis.extraStorageColumnsForAuxDdb;
    } else if (oThis.isOriginChain(chainId)) {
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
        gatewayContractAddress: {
          shortName: 'gwca',
          dataType: 'S'
        },
        baseCurrencyContractAddress: {
          shortName: 'bcca',
          dataType: 'S'
        }
      },
      pendingTransactions: oThis.pendingTransactionsExtraConfig,
      transactions: oThis.transactionsExtraConfig
    };
  }

  get transactionsExtraConfig() {
    return {
      metaProperty: {
        shortName: 'mp',
        dataType: 'S'
      },
      ruleId: {
        shortName: 'rid',
        dataType: 'N'
      },
      tokenId: {
        shortName: 'ti',
        dataType: 'N'
      },
      kind: {
        shortName: 'kd',
        dataType: 'N'
      }
    };
  }

  get pendingTransactionsExtraConfig() {
    return {
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
      kind: {
        shortName: 'kd',
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
    };
  }

  get subEnvDdbTablePrefix() {
    const oThis = this;
    return oThis.configStrategy[configStrategyConstants.constants].subEnvDdbTablePrefix;
  }

  get esConfig() {}
}

module.exports = ConfigStrategyObject;
