'use strict';
/**
 * Class for chain config provider.
 *
 * @module lib/providers/chainConfig
 */
const rootPrefix = '../..',
  CsCrudByChainId = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  ConfigStrategyModel = require(rootPrefix + '/app/models/mysql/ConfigStrategy'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

// Declare variables.
let allChainIds = null,
  chainIdToConfigMap = {};

/**
 * Class for chain config provider
 *
 * @class
 */
class ChainConfig {
  /**
   * Constructor for chain config provider
   *
   * @constructor
   */
  constructor() {}

  /**
   * Get configs for chain ids
   *
   * @param {Array} chainIds: array of chain ids
   *
   * @returns {Promise<void>}
   */
  async getFor(chainIds) {
    const oThis = this;

    if (!chainIds || chainIds.length === 0) {
      chainIds = await oThis._allChainIds();
    }

    let missingConfigChainIds = [],
      result = {};

    for (let index = 0; index < chainIds.length; index++) {
      let chainId = chainIds[index];

      if (chainIdToConfigMap[chainId]) {
        result[chainId] = chainIdToConfigMap[chainId];
      } else {
        missingConfigChainIds.push(chainId);
      }
    }

    if (missingConfigChainIds.length > 0) {
      let missingConfigs = await oThis._getConfigFor(missingConfigChainIds);
      Object.assign(chainIdToConfigMap, missingConfigs);
      Object.assign(result, missingConfigs);
    }

    if (chainIds.length > 1) {
      let originChainId = null;
      for (let chainId in result) {
        let res = result[chainId];
        if (res[configStrategyConstants.constants] && res[configStrategyConstants.constants].originChainId) {
          originChainId = res[configStrategyConstants.constants].originChainId;
          break;
        }
      }
      // If more than on chain passed and value chain is present exclude it from result.
      if (originChainId) {
        delete result[originChainId];
      }
    }

    return result;
  }

  _isValueChain() {}

  /**
   * Fetch all chainIds.
   *
   * @returns {Promise<*>}
   *
   * @private
   */
  async _allChainIds() {
    if (!allChainIds) {
      allChainIds = [];
      let queryResult = await new ConfigStrategyModel()
        .select('DISTINCT chain_id')
        .where('chain_id > 0')
        .fire();
      for (let i = 0; i < queryResult.length; i++) {
        allChainIds.push(queryResult[i].chain_id);
      }
    }

    return allChainIds;
  }

  /**
   * Fetch config strategy for the passed chainIds.
   *
   * @param {Array} chainIds
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _getConfigFor(chainIds) {
    let result = {};

    for (let index = 0; index < chainIds.length; index++) {
      let chainId = chainIds[index],
        csCrudByChainId = new CsCrudByChainId(chainIds[index]),
        configResponse = await csCrudByChainId.getComplete();

      result[chainId] = configResponse.data;
    }

    return result;
  }
}

module.exports = new ChainConfig();
