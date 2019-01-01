'use strict';

/**
 * Object that gives getter methods on config strategy fetched for a chain
 *
 * @module helpers/configStrategy/Object
 */

const rootPrefix = '../..',
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

class ConfigStrategyObject {
  /**
   * @constructor
   * @param configStrategy
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
