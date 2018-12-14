'use strict';

const rootPrefix = '..',
  clientConfigStrategyCacheKlass = require(rootPrefix + '/lib/sharedCacheMultiManagement/clientConfigStrategies'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/config_strategy'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ConfigStrategyModel = require(rootPrefix + '/app/models/config_strategy'),
  configStrategyCacheKlass = require(rootPrefix + '/lib/sharedCacheMultiManagement/configStrategy');

/**
 *
 * @constructor
 */
const ConfigStrategyKlass = function() {};

ConfigStrategyKlass.prototype = {
  /**
   * Get final hash of config strategy
   * @param {number} clientId: client ID whose config strategy hash is needed.
   * @param {String} gethEndPointType: type of geth endpoint.
   *
   * @return {Promise<Object>} Hash of config strategy
   */
  getConfigStrategy: async function(clientId, gethEndPointType) {
    let clientConfigStrategyCacheObj = new clientConfigStrategyCacheKlass({ clientIds: [clientId] }),
      fetchCacheRsp = await clientConfigStrategyCacheObj.fetch();

    if (fetchCacheRsp.isFailure()) {
      return Promise.reject(fetchCacheRsp);
    }

    gethEndPointType = gethEndPointType ? gethEndPointType : 'read_write';

    let cacheData = fetchCacheRsp.data[clientId];

    let strategyIdsArray = cacheData.configStrategyIds,
      configStrategyCacheObj = new configStrategyCacheKlass({ strategyIds: strategyIdsArray }),
      configStrategyFetchRsp = await configStrategyCacheObj.fetch(),
      finalConfigStrategyFlatHash = cacheData.shard_names;

    if (configStrategyFetchRsp.isFailure()) {
      return Promise.reject(configStrategyFetchRsp);
    }

    let configStrategyIdToDetailMap = configStrategyFetchRsp.data;

    for (let configStrategyId in configStrategyIdToDetailMap) {
      let configStrategy = configStrategyIdToDetailMap[configStrategyId];

      for (let strategyKind in configStrategy) {
        let partialConfig = configStrategy[strategyKind];

        if (strategyKind == 'utility_geth') {
          let tempConfig = partialConfig[gethEndPointType];
          delete partialConfig['read_write'];
          delete partialConfig['read_only'];
          Object.assign(partialConfig, tempConfig);
        }

        Object.assign(finalConfigStrategyFlatHash, partialConfig);
      }
    }

    return Promise.resolve(responseHelper.successWithData(finalConfigStrategyFlatHash));
  },

  getStrategyIdForKind: async function(clientId, kind) {
    let clientConfigStrategyCacheObj = new clientConfigStrategyCacheKlass({ clientIds: [clientId] }),
      strategyIdsFetchRsp = await clientConfigStrategyCacheObj.fetch(),
      strategyIdForKind = [];

    if (strategyIdsFetchRsp.isFailure()) {
      return Promise.reject(strategyIdsFetchRsp);
    }

    let strategyIdsArray = strategyIdsFetchRsp.data[clientId].configStrategyIds;

    let strategyKindtoIdMapRsp = await new ConfigStrategyModel()
      .select(['id', 'kind'])
      .where(['id in (?)', strategyIdsArray])
      .fire();

    for (let index = 0; index < strategyKindtoIdMapRsp.length; index++) {
      if (String(strategyKindtoIdMapRsp[index].kind) === configStrategyConstants.invertedKinds[kind]) {
        strategyIdForKind.push(strategyKindtoIdMapRsp[index].id);
      }
    }

    return Promise.resolve(responseHelper.successWithData(strategyIdForKind));
  }
};

module.exports = ConfigStrategyKlass;
