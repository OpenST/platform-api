# Cron Process Seed (for local setup)

* Source environment variables.
```bash
source set_env_vars.sh
```

* Create entries for all the crons.
```js
function addCronProcessEntries() {
  let promiseArray = [];
  
  // Create entry for blockParser.
    let p1 =  (function insertBlockParser() {
    let cronParams = '{"intentionalBlockDelay": 0, "chainId":2000}',
      insertParams = {
        id: 1,
        kind: 'blockParser',
        ip_address: '127.0.0.1',
        chain_id: 2000,
        params: cronParams,
        status: 'stopped'
    };
    let CronProcessModel = require('./app/models/mysql/CronProcesses'),
    cronProcessObj = new CronProcessModel();
    cronProcessObj.insertRecord(insertParams);
    })();
  
    promiseArray.push(p1);
  
  // Create entry for transactionParser.
    let p2 =  (function transactionParser() {
      let cronParams = '{"prefetchCount": 1, "chainId":2000}',
        insertParams = {
          id: 2,
          kind: 'transactionParser',
          ip_address: '127.0.0.1',
          chain_id: 2000,
          params: cronParams,
          status: 'stopped'
      };
      let CronProcessModel = require('./app/models/mysql/CronProcesses'),
      cronProcessObj = new CronProcessModel();
      cronProcessObj.insertRecord(insertParams);
    })();
    
    promiseArray.push(p2);
    
  // Create entry for Aux blockFinalizer.
    let p3 =  (function auxBlockFinalizer() {
      let cronParams = '{"blockDelay": 24, "chainId":2000}',
        insertParams = {
          id: 3,
          kind: 'blockFinalizer',
          ip_address: '127.0.0.1',
          chain_id: 2000,
          params: cronParams,
          status: 'stopped'
      };
      let CronProcessModel = require('./app/models/mysql/CronProcesses'),
      cronProcessObj = new CronProcessModel();
      cronProcessObj.insertRecord(insertParams);
    })();
    
    promiseArray.push(p3);
      
  // Create entry for economyAggregator.
    let p4 =  (function economyAggregator() {
      let cronParams = '{"prefetchCount": 1, "chainId":2000}',
        insertParams = {
          id: 4,
          kind: 'economyAggregator',
          ip_address: '127.0.0.1',
          chain_id: 2000,
          params: cronParams,
          status: 'stopped'
      };
      let CronProcessModel = require('./app/models/mysql/CronProcesses'),
      cronProcessObj = new CronProcessModel();
      cronProcessObj.insertRecord(insertParams);
    })();
    
    promiseArray.push(p4);
    
  // Create entry for workflowWorker.
    let p5 =  (function workflowWorker() {
    let cronParams = '{"prefetchCount": 5}',
      insertParams = {
        id: 5,
        kind: 'workflowWorker',
        ip_address: '127.0.0.1',
        chain_id: 2000, // TODO - remove chain id
        params: cronParams,
        status: 'stopped'
    };
    let CronProcessModel = require('./app/models/mysql/CronProcesses'),
    cronProcessObj = new CronProcessModel();
    cronProcessObj.insertRecord(insertParams);
    })();
    
    promiseArray.push(p5);
    
  // Create entry for Origin blockFinalizer.
    let p6 =  (function originBlockFinalizer() {
      let cronParams = '{"blockDelay": 24, "chainId":1000}',
        insertParams = {
          id: 6,
          kind: 'blockFinalizer',
          ip_address: '127.0.0.1',
          chain_id: 1000,
          params: cronParams,
          status: 'stopped'
      };
      let CronProcessModel = require('./app/models/mysql/CronProcesses'),
      cronProcessObj = new CronProcessModel();
      cronProcessObj.insertRecord(insertParams);
    })();
    
    promiseArray.push(p6);
    
    // Create entry for origin blockParser.
      let p7 =  (function insertBlockParser() {
        let cronParams = '{"intentionalBlockDelay": 0, "chainId":1000}',
          insertParams = {
            id: 7,
            kind: 'blockParser',
            ip_address: '127.0.0.1',
            chain_id: 1000,
            params: cronParams,
            status: 'stopped'
        };
        let CronProcessModel = require('./app/models/mysql/CronProcesses'),
        cronProcessObj = new CronProcessModel();
        cronProcessObj.insertRecord(insertParams);
      })();
      
      promiseArray.push(p7);
      
    // Create entry for origin transactionParser.
      let p8 =  (function transactionParser() {
        let cronParams = '{"prefetchCount": 1, "chainId":1000}',
           insertParams = {
             id: 8,
             kind: 'transactionParser',
             ip_address: '127.0.0.1',
             chain_id: 1000,
             params: cronParams,
             status: 'stopped'
        };
        let CronProcessModel = require('./app/models/mysql/CronProcesses'),
        cronProcessObj = new CronProcessModel();
        cronProcessObj.insertRecord(insertParams);
      })();
        
      promiseArray.push(p8);
      
    // Create entry for origin fundByChainOwnerOriginChainSpecific.
      let p9 =  (function fundByChainOwnerOriginChainSpecific() {
        let cronParams = '{"originChainId": 1000}',
           insertParams = {
             id: 9,
             kind: 'fundByChainOwnerOriginChainSpecific',
             ip_address: '127.0.0.1',
             chain_id: 1000,
             params: cronParams,
             status: 'stopped'
        };
        let CronProcessModel = require('./app/models/mysql/CronProcesses'),
        cronProcessObj = new CronProcessModel();
        cronProcessObj.insertRecord(insertParams);
      })();
        
      promiseArray.push(p9);
      
    // Create entry for fundByChainOwnerAuxChainSpecific.
      let p10 =  (function fundByChainOwnerOriginChainSpecific() {
        let cronParams = '{"originChainId": 1000, "auxChainIds": [2000]}',
           insertParams = {
             id: 10,
             kind: 'fundByChainOwnerAuxChainSpecific',
             ip_address: '127.0.0.1',
             chain_id: null,
             params: cronParams,
             status: 'stopped'
        };
        let CronProcessModel = require('./app/models/mysql/CronProcesses'),
        cronProcessObj = new CronProcessModel();
        cronProcessObj.insertRecord(insertParams);
      })();
        
      promiseArray.push(p10);
      
    return Promise.all(promiseArray);
};

addCronProcessEntries().then(function() {
  console.log('Entries made successfully.');
})
```
