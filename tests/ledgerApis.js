'use strict';

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '..';

const StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId');
const strategyByChainHelperObj = new StrategyByChainHelper(2000);

const coreConstants = require(rootPrefix + '/config/coreConstants');
require(rootPrefix + '/app/services/transaction/get/TransactionsList');

const esServices = require(rootPrefix + '/lib/elasticsearch/manifest'),
  ESTransactionService = esServices.services.transactions;
const userId = 'a38bc737-54b7-4042-8364-511bf17c2997',
  txuuid = '64c01c94-8631-415f-903f-edc36bc68710',
  tokenId = 1016;

const FetchPendingTransactionsByUuid = require(rootPrefix + '/lib/transactions/FetchPendingTransactionsByUuid');

let configStrategyResp = null;
getStrategyByChainHelperObj()
  .then(async function(res) {
    configStrategyResp = res;
    const configStrategy = configStrategyResp.data;
    const ic = new InstanceComposer(configStrategy),
      GetUserTransactions = ic.getShadowedClassFor(coreConstants.icNameSpace, 'GetTransactionsList'),
      getTransaction = new FetchPendingTransactionsByUuid(2000, [txuuid], false);
    let resp = await getTransaction.perform(),
      data = resp['data'],
      transactionDetails = data[txuuid];

    let esServices = new ESTransactionService({
      chainId: 2000,
      elasticSearch: {
        host: 'localhost:9200',
        apiVersion: '6.2'
      }
    });

    console.log('resp', resp);
    console.log('data', data);
    console.log('transactionDetails', transactionDetails);

    transactionDetails = {
      val: { N: '0' },
      cts: { N: '1550830261' },
      gl: { N: '150000' },
      gp: { N: '1000000000' },
      es: {
        S:
          '{"r":"0xd9d33da0a6c4db45d49a77e22f26c467e0d16e52d9e1e2596b0b7a2a7eed04b5","s":"0x5aea34ca439bae520c915b800a38577d22165d6d12f66eddca3ad7a80a857c89","v":"0x1c","messageHash":"0x4fe226e5ce2a5cf3ca238825e2e95a1b0e8675d8942565250e11dde729dc4397","signature":"0xd9d33da0a6c4db45d49a77e22f26c467e0d16e52d9e1e2596b0b7a2a7eed04b55aea34ca439bae520c915b800a38577d22165d6d12f66eddca3ad7a80a857c891c"}'
      },
      ra: { S: '0xec2dea541c7c12040a720f0c9cff6c852eae11e8' },
      ud: {
        S:
          '[{"era":"0x5c86d182af628099cacb789e2918e174d2c84fc5","tha":"0x24b4bf75a3282b397c13c3a30cc08da1430c0f1b","bud":"10"}]'
      },
      ted: {
        S:
          '0x94ac7a3f00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000100000000000000000000000024b4bf75a3282b397c13c3a30cc08da1430c0f1b0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000a'
      },
      sts: { N: '1' },
      trs: {
        S:
          '[{"fa":"0x24b4bf75a3282b397c13c3a30cc08da1430c0f1b","ta":"0x24b4bf75a3282b397c13c3a30cc08da1430c0f1b","v":"10"}]'
      },
      uts: { N: '1550830261' },
      ti: { N: '1016' },
      tad: { S: '0x24b4bf75a3282b397c13c3a30cc08da1430c0f1b' },
      skn: { S: '3' },
      txuuid: { S: '64c01c94-8631-415f-903f-edc36bc68710' },
      ea: { S: '0x5c86d182af628099cacb789e2918e174d2c84fc5' },
      cid: { N: '2000' }
    };

    await esServices.update(transactionDetails);

    let services = new GetUserTransactions({
      user_id: userId,
      status: [0, 1, 2],
      token_id: tokenId
      // meta_property: [
      //   {
      //     n: 'name1',
      //     t: 'type1',
      //     d: 'details1'
      //   },
      //   {
      //     n: 'name2',
      //     t: 'type2',
      //     d: 'details2'
      //   }
      // ]
    });

    console.log('======START=====');

    let response = services.perform();

    console.log('response', JSON.stringify(response));

    console.log('======END=====');
  })
  .catch(function(reason) {
    console.log('======ERROR=====', reason);
  });

async function getStrategyByChainHelperObj() {
  return await strategyByChainHelperObj.getComplete();
}

module.exports = {};
