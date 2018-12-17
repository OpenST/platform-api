'use strict';

/**
 * This script provides config strategy on the basis of client id.
 * This provides functionality to
 * 1. Get Config Strategy Hash - get()
 * 2. Get Config Strategy Hash for given kind - getForKind()
 * 3. Get Config Strategy Ids for given kind - getStrategyIdForKind()
 *
 * @type {string}
 */
const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  ConfigStrategyModel = require(rootPrefix + '/app/models/mysql/ConfigStrategy'),
  ClientConfigStrategyCache = require(rootPrefix + '/lib/sharedCacheMultiManagement/clientConfigStrategies'),
  ConfigStrategyCache = require(rootPrefix + '/lib/sharedCacheMultiManagement/configStrategy');

class ConfigStrategyByClientId {

  constructor(clientId) {
    const oThis = this;

    oThis.clientId = clientId;
  }

  /**
   * Get final hash of config strategy.
   *
   * @returns {Promise<>}
   */
  async get() {
    const oThis = this;

    let clientId = oThis.clientId;

    if (clientId === undefined) {
      logger.error('client Id is not defined. To get complete hash client id is compulsory.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'h_cs_bci_4',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    let clientConfigStrategyCacheObj = new ClientConfigStrategyCache({ clientIds: [clientId] }),
      fetchCacheRsp = await clientConfigStrategyCacheObj.fetch();

    if (fetchCacheRsp.isFailure()) {
      return Promise.reject(fetchCacheRsp);
    }

    let cacheData = fetchCacheRsp.data[clientId];

    let strategyIdsArray = cacheData.configStrategyIds,
      configStrategyCacheObj = new ConfigStrategyCache({ strategyIds: strategyIdsArray }),
      configStrategyFetchRsp = await configStrategyCacheObj.fetch();

    if (configStrategyFetchRsp.isFailure()) {
      return Promise.reject(configStrategyFetchRsp);
    }

    let finalConfigHash = {},
      configStrategyIdToDetailMap = configStrategyFetchRsp.data;

    for (let configStrategyId in configStrategyIdToDetailMap) {
      Object.assign(finalConfigHash, configStrategyIdToDetailMap[configStrategyId]);
    }

    return Promise.resolve(responseHelper.successWithData(finalConfigHash));
  }

  /**
   *
   * This function will return config strategy hash for the kind passed as an argument.
   * @param {string} kind - kind should be provided as a string. (Eg. dynamo or dax etc)
   * @returns {Promise<*>}
   */
  async getForKind(kind) {
    const oThis = this,
      clientId = oThis.clientId;

    if (clientId === undefined) {
      logger.error('client Id is not defined. To get complete hash client id is compulsory.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'h_cs_bci_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    let clientConfigStrategyCacheObj = new ClientConfigStrategyCache({ clientIds: [clientId] }),
      strategyIdsFetchRsp = await clientConfigStrategyCacheObj.fetch();

    if (strategyIdsFetchRsp.isFailure()) {
      return Promise.reject(strategyIdsFetchRsp);
    }

    let strategyIdInt = configStrategyConstants.invertedKinds[kind];

    if (strategyIdInt === undefined) {
      logger.error('Provided kind is not proper. Please check kind');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'h_cs_bci_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    let strategyIdsArray = strategyIdsFetchRsp.data[clientId].configStrategyIds;

    //Following is to fetch specific strategy id for the kind passed.
    let specificStrategyIdArray = await new ConfigStrategyModel()
      .select(['id'])
      .where(['id in (?) AND kind = ?', strategyIdsArray, strategyIdInt])
      .fire();

    if (specificStrategyIdArray.length !== 1) {
      logger.error('Strategy Id for the provided kind not found.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'h_cs_bci_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    let strategyId = specificStrategyIdArray[0].id,
      strategyIdArray = [strategyId],
      configStrategyCacheObj = new ConfigStrategyCache({ strategyIds: strategyIdArray }),
      configStrategyFetchRsp = await configStrategyCacheObj.fetch();

    if (configStrategyFetchRsp.isFailure()) {
      return Promise.reject(configStrategyFetchRsp);
    }

    let finalConfigHash = configStrategyFetchRsp.data;

    return Promise.resolve(responseHelper.successWithData(finalConfigHash));
  }
  
  async getStrategyIdForKind(kind) {
    const oThis = this;
    
    let clientId = oThis.clientId,
      strategyIdForKind = [],
      clientConfigStrategyCacheObj = new ClientConfigStrategyCache({ clientIds: [clientId] }),
      strategyIdsFetchRsp = await clientConfigStrategyCacheObj.fetch();
    
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

}

module.exports = ConfigStrategyByClientId;
