'use strict';
/**
 * Class for chain config provider.
 *
 * @module lib/providers/chainConfig
 */
const rootPrefix = '../..',
  ConfigStrategyModel = require(rootPrefix + '/app/models/mysql/ConfigStrategy'),
  CsCrudByChainId = require(rootPrefix + '/helpers/configStrategy/ByChainId');

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

    for(let index = 0; index < chainIds.length; index++) {
      let chainId = chainIds[index];

      if(chainIdToConfigMap[chainId]) {
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

    return result;
  }

  /**
   * Fetch all chainIds.
   *
   * @returns {Promise<*>}
   *
   * @private
   */
  async _allChainIds() {
    if(!allChainIds){
      allChainIds = [];
      let queryResult = await new ConfigStrategyModel().select('DISTINCT chain_id').fire();
      for(let i=0; i<queryResult.length; i++){
        allChainIds.push(queryResult[i].chain_id);
      }
    }

    return allChainIds
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

    for(let index = 0; index < chainIds.length; index++){
      let chainId = chainIds[index],
        csCrudByChainId = new CsCrudByChainId(chainIds[index]),
        configResponse = await csCrudByChainId.getComplete();

      result[chainId] = configResponse.data;
    }

    return result;
  }
}

module.exports = new ChainConfig();