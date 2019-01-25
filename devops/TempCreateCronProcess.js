function addCronProcessEntries(originChainId, auxChainId, ipAddress) {
  let promiseArray = [];

  // Create entry for blockParser.
  let p1 = (function insertBlockParser() {
    let cronParams = `{"intentionalBlockDelay": 0, "chainId":${auxChainId}}`,
      insertParams = {
        id: 1,
        kind: 'blockParser',
        ip_address: ipAddress,
        chain_id: auxChainId,
        params: cronParams,
        status: 'stopped'
      };
    let CronProcessModel = require('./app/models/mysql/CronProcesses'),
      cronProcessObj = new CronProcessModel();
    cronProcessObj.insertRecord(insertParams);
  })();

  promiseArray.push(p1);

  // Create entry for transactionParser.
  let p2 = (function transactionParser() {
    let cronParams = `{"prefetchCount": 1, "chainId":${auxChainId}}`,
      insertParams = {
        id: 2,
        kind: 'transactionParser',
        ip_address: ipAddress,
        chain_id: auxChainId,
        params: cronParams,
        status: 'stopped'
      };
    let CronProcessModel = require('./app/models/mysql/CronProcesses'),
      cronProcessObj = new CronProcessModel();
    cronProcessObj.insertRecord(insertParams);
  })();

  promiseArray.push(p2);

  // Create entry for Aux blockFinalizer.
  let p3 = (function auxBlockFinalizer() {
    let cronParams = `{"blockDelay": 24, "chainId":${auxChainId}}`,
      insertParams = {
        id: 3,
        kind: 'blockFinalizer',
        ip_address: ipAddress,
        chain_id: auxChainId,
        params: cronParams,
        status: 'stopped'
      };
    let CronProcessModel = require('./app/models/mysql/CronProcesses'),
      cronProcessObj = new CronProcessModel();
    cronProcessObj.insertRecord(insertParams);
  })();

  promiseArray.push(p3);

  // Create entry for economyAggregator.
  let p4 = (function economyAggregator() {
    let cronParams = `{"prefetchCount": 1, "chainId":${auxChainId}}`,
      insertParams = {
        id: 4,
        kind: 'economyAggregator',
        ip_address: ipAddress,
        chain_id: auxChainId,
        params: cronParams,
        status: 'stopped'
      };
    let CronProcessModel = require('./app/models/mysql/CronProcesses'),
      cronProcessObj = new CronProcessModel();
    cronProcessObj.insertRecord(insertParams);
  })();

  promiseArray.push(p4);

  // Create entry for workflowWorker.
  let p5 = (function workflowWorker() {
    let cronParams = '{"prefetchCount": 5}',
      insertParams = {
        id: 5,
        kind: 'workflowWorker',
        ip_address: ipAddress,
        chain_id: auxChainId,
        params: cronParams,
        status: 'stopped'
      };
    let CronProcessModel = require('./app/models/mysql/CronProcesses'),
      cronProcessObj = new CronProcessModel();
    cronProcessObj.insertRecord(insertParams);
  })();

  promiseArray.push(p5);

  // Create entry for Origin blockFinalizer.
  let p6 = (function originBlockFinalizer() {
    let cronParams = `{"blockDelay": 24, "chainId":${originChainId}}`,
      insertParams = {
        id: 6,
        kind: 'blockFinalizer',
        ip_address: ipAddress,
        chain_id: originChainId,
        params: cronParams,
        status: 'stopped'
      };
    let CronProcessModel = require('./app/models/mysql/CronProcesses'),
      cronProcessObj = new CronProcessModel();
    cronProcessObj.insertRecord(insertParams);
  })();

  promiseArray.push(p6);

  // Create entry for origin blockParser.
  let p7 = (function OriginInsertBlockParser() {
    let cronParams = `{"intentionalBlockDelay": 0, "chainId":${originChainId}}`,
      insertParams = {
        id: 7,
        kind: 'blockParser',
        ip_address: ipAddress,
        chain_id: originChainId,
        params: cronParams,
        status: 'stopped'
      };
    let CronProcessModel = require('./app/models/mysql/CronProcesses'),
      cronProcessObj = new CronProcessModel();
    cronProcessObj.insertRecord(insertParams);
  })();

  promiseArray.push(p7);

  // Create entry for origin transactionParser.
  let p8 = (function OriginTransactionParser() {
    let cronParams = `{"prefetchCount": 1, "chainId":${originChainId}}`,
      insertParams = {
        id: 8,
        kind: 'transactionParser',
        ip_address: ipAddress,
        chain_id: originChainId,
        params: cronParams,
        status: 'stopped'
      };
    let CronProcessModel = require('./app/models/mysql/CronProcesses'),
      cronProcessObj = new CronProcessModel();
    cronProcessObj.insertRecord(insertParams);
  })();

  promiseArray.push(p8);

  return Promise.all(promiseArray);
}

let auxChainId = 201;
let originChainId = 3;
let ipAddress = '121.141.37.196';
addCronProcessEntries(originChainId, auxChainId, ipAddress).then(function() {
  console.log('Entries made successfully.');
});
