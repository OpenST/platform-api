'use strict';

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '..';

const StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId');
const strategyByChainHelperObj = new StrategyByChainHelper(2000),
  configStrategyResp = getStrategyByChainHelperObj();

const configStrategy = configStrategyResp.data;

const ic = new InstanceComposer(configStrategy);

async function getStrategyByChainHelperObj() {
  await strategyByChainHelperObj.getComplete();
}

require(rootPrefix + '/app/services/transaction/GetUserTransactions');

const coreConstants = require(rootPrefix + '/config/coreConstants'),
  GetUserTransactions = ic.getShadowedClassFor(coreConstants.icNameSpace, 'GetUserTransactions');

console.log('GetUserTransactions', GetUserTransactions);

let timestamp = parseInt(Date.now() / 100),
  userId = 'id' + timestamp;

let userTransaction = new GetUserTransactions({
  user_id: userId,
  status: [0, 1, 2],
  meta_property: [
    {
      n: 'name1',
      t: 'type1',
      d: 'details1'
    },
    {
      n: 'name2',
      t: 'type2',
      d: 'details2'
    }
  ]
});

console.log('======START=====');
console.log('getServiceConfig', userTransaction.getServiceConfig());
console.log('getElasticSearchQuery', userTransaction.getElasticSearchQuery(userId));
console.log('======END=====');

module.exports = {};
