'use strict';

const rootPrefix = '../..';

const ConfigStrategyModel = require(rootPrefix + '/app/models/mysql/ConfigStrategy'),
  CsCrudByChainId = require(rootPrefix + '/helpers/configStrategy/ByChainId');

let allChainIds = null;

let chainIdToConfigMap = {};

class ChainConfig {

  constructor() {}

  async getInstance(chainIds) {
    const oThis = this;

    if (!chainIds || chainIds.length == 0) {
      chainIds = await oThis._allChainIds();
    }

    let missingConfigChainIds = [],
      result = {};

    console.log('chainIds--', chainIds);

    for(let i = 0; i < chainIds.length; i++) {
      let chainId = chainIds[i];

      if(chainIdToConfigMap[chainId]) {
        result[chainId] = chainIdToConfigMap[chainId];
      } else {
        missingConfigChainIds.push(chainId);
      }
    }

    console.log('missingConfigChainIds--', missingConfigChainIds);

    if (missingConfigChainIds.length > 0) {
      let missingConfigs = await oThis._getConfigFor(missingConfigChainIds);
      Object.assign(chainIdToConfigMap, missingConfigs);
      Object.assign(result, missingConfigs);
    }

    return result;
  }

  async _allChainIds() {
    if(!allChainIds){
      allChainIds = [];
      let queryResult = await new ConfigStrategyModel().select('DISTINCT chain_id').fire();
      for(let i=0; i<queryResult.length; i++){
        allChainIds.push(queryResult[i].chain_id);
      }
    }
    console.log('allChainIds-------------', allChainIds);
    return allChainIds
  }

  async _getConfigFor(chainIds) {

    let result = {};

    for(let i=0; i<chainIds.length; i++){
      let chainId = chainIds[i];
      console.log('_getConfigFor-- chainId', chainId);
      let csCrudByChainId = new CsCrudByChainId(chainIds[i]);
      let configResponse = await csCrudByChainId.getComplete();
      result[chainId] = configResponse.data;
    }

    console.log('_getConfigFor-- result', result);

    return result;

  }

}

module.exports = new ChainConfig();