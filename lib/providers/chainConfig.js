/**
 * Module for chain config provider.
 *
 * @module lib/providers/chainConfig
 */

const rootPrefix = '../..',
  CsCrudByChainId = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  ConfigStrategyModel = require(rootPrefix + '/app/models/mysql/ConfigStrategy'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

// Declare variables.
let allAuxChainIds = null,
  chainIdToConfigMap = {};

/**
 * Class for chain config provider.
 *
 * @class ChainConfig
 */
class ChainConfig {
  /**
   * Get configs for chain ids
   *
   * @param {array} [chainIds]: array of chain ids
   *
   * @returns {Promise<void>}
   */
  async getFor(chainIds) {
    const oThis = this;

    if (!chainIds || chainIds.length === 0) {
      chainIds = await oThis.allAuxChainIds();
    }

    const missingConfigChainIds = [],
      result = {};

    for (let index = 0; index < chainIds.length; index++) {
      const chainId = chainIds[index];

      if (chainIdToConfigMap[chainId]) {
        result[chainId] = chainIdToConfigMap[chainId];
      } else {
        missingConfigChainIds.push(chainId);
      }
    }

    if (missingConfigChainIds.length > 0) {
      const missingConfigs = await oThis._getConfigFor(missingConfigChainIds);

      Object.assign(chainIdToConfigMap, missingConfigs);
      Object.assign(result, missingConfigs);
    }

    if (chainIds.length > 1) {
      let originChainId = null;
      for (const chainId in result) {
        const res = result[chainId];
        if (res[configStrategyConstants.constants] && res[configStrategyConstants.constants].originChainId) {
          originChainId = res[configStrategyConstants.constants].originChainId;
          break;
        }
      }
      // Origin chain config not to be fetched along with other aux chains.
      if (originChainId) {
        delete result[originChainId];
      }
    }

    return result;
  }

  /**
   * Fetch all chainIds.
   *
   * @returns {Promise<*>}
   * @private
   */
  async allAuxChainIds() {
    if (!allAuxChainIds) {
      allAuxChainIds = [];

      // Following query is in-memory cached. Origin chain Id is avoided here as chain_id is greater than 0.
      const queryResult = await new ConfigStrategyModel()
        .select('DISTINCT chain_id')
        .where('chain_id > 0')
        .fire();

      for (let i = 0; i < queryResult.length; i++) {
        allAuxChainIds.push(queryResult[i].chain_id);
      }
    }

    return allAuxChainIds;
  }

  /**
   * Fetch config strategy for the passed chainIds.
   *
   * @param {array} chainIds
   *
   * @returns {Promise<void>}
   * @private
   */
  async _getConfigFor(chainIds) {
    const result = {};

    for (let index = 0; index < chainIds.length; index++) {
      const chainId = chainIds[index],
        csCrudByChainId = new CsCrudByChainId(chainId),
        configResponse = await csCrudByChainId.getComplete();

      result[chainId] = configResponse.data;
    }

    return result;
  }
}

module.exports = new ChainConfig();
