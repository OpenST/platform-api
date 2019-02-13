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
      let cronParams = '{"chainId":2000}',
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
      let cronParams = '{"chainId":1000}',
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
      
    // Create entry for origin fundByMasterInternalFunderOriginChainSpecific.
      let p9 =  (function fundByMasterInternalFunderOriginChainSpecific() {
        let cronParams = '{"originChainId": 1000}',
           insertParams = {
             id: 9,
             kind: 'fundByMasterInternalFunderOriginChainSpecific',
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
      
    // Create entry for fundByMasterInternalFunderAuxChainSpecificChainAddresses.
      let p10 =  (function fundByMasterInternalFunderAuxChainSpecificChainAddresses() {
        let cronParams = '{"originChainId": 1000, "auxChainIds": [2000]}',
           insertParams = {
             id: 10,
             kind: 'fundByMasterInternalFunderAuxChainSpecificChainAddresses',
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
      
      // Create entry for fundBySealerAuxChainSpecific.
       let p11 =  (function fundBySealerAuxChainSpecific() {
         let cronParams = '{"originChainId": 1000}',
          insertParams = {
           id: 11,
           kind: 'fundBySealerAuxChainSpecific',
           ip_address: '127.0.0.1',
           chain_id: null,
           params: cronParams,
           status: 'stopped'
          };
          let CronProcessModel = require('./app/models/mysql/CronProcesses'),
          cronProcessObj = new CronProcessModel();
          cronProcessObj.insertRecord(insertParams);
        })();
              
       promiseArray.push(p11);
       
       // Create entry for fundByTokenAuxFunderAuxChainSpecific.
       let p12 =  (function fundByTokenAuxFunderAuxChainSpecific() {
         let cronParams = '{"originChainId": 1000}',
          insertParams = {
           id: 12,
           kind: 'fundByTokenAuxFunderAuxChainSpecific',
           ip_address: '127.0.0.1',
           chain_id: null,
           params: cronParams,
           status: 'stopped'
          };
          let CronProcessModel = require('./app/models/mysql/CronProcesses'),
          cronProcessObj = new CronProcessModel();
          cronProcessObj.insertRecord(insertParams);
         })();
                 
       promiseArray.push(p12);
       
      // Create entry for updatePriceOraclePricePoints.
       let p13 =  (function updatePriceOraclePricePoints() {
         let cronParams = '{"auxChainId": 2000}',
          insertParams = {
           id: 13,
           kind: 'updatePriceOraclePricePoints',
           ip_address: '127.0.0.1',
           chain_id: 2000,
           params: cronParams,
           status: 'stopped'
          };
          let CronProcessModel = require('./app/models/mysql/CronProcesses'),
          cronProcessObj = new CronProcessModel();
          cronProcessObj.insertRecord(insertParams);
         })();
                 
       promiseArray.push(p13);
       
      // Create entry for email .notifier.
        let p14 =  (function emailNotifier() {
            let cronParams = '{}',
            insertParams = {
             id: 14,
             kind: 'emailNotifier',
             ip_address: '127.0.0.1',
             chain_id: 2000,
             params: cronParams,
             status: 'stopped'
            };
            let CronProcessModel = require('./app/models/mysql/CronProcesses'),
            cronProcessObj = new CronProcessModel();
            cronProcessObj.insertRecord(insertParams);
        })();
               
        promiseArray.push(p14);   
       
      // Create entry for fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses.
        let p15 =  (function fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses() {
          let cronParams = '{"originChainId": 1000, "auxChainIds": [2000]}',
            insertParams = {
              id: 15,
              kind: 'fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses',
              ip_address: '127.0.0.1',
              chain_id: null,
              params: cronParams,
              status: 'stopped'
            };
          let CronProcessModel = require('./app/models/mysql/CronProcesses'),
          cronProcessObj = new CronProcessModel();
          cronProcessObj.insertRecord(insertParams);
        })();
          
        promiseArray.push(p15); 
        
     // Create entry for fundByChainOwnerAuxChainSpecificInterChainFacilitatorAddresses.
      let p16 =  (function fundByChainOwnerAuxChainSpecificInterChainFacilitatorAddresses() {
        let cronParams = '{"originChainId": 1000, "auxChainIds": [2000]}',
          insertParams = {
            id: 16,
            kind: 'fundByChainOwnerAuxChainSpecificInterChainFacilitatorAddresses',
            ip_address: '127.0.0.1',
            chain_id: null,
            params: cronParams,
            status: 'stopped'
       };
       let CronProcessModel = require('./app/models/mysql/CronProcesses'),
       cronProcessObj = new CronProcessModel();
       cronProcessObj.insertRecord(insertParams);
     })();
       
     promiseArray.push(p16);  
     
    // Create entry for auxWorkflowWorker.
      let p18 =  (function auxWorkflowWorker() {
        let cronParams = '{"prefetchCount": 5}',
          insertParams = {
            id: 18,
            kind: 'auxWorkflowWorker',
            ip_address: '127.0.0.1',
            chain_id: 2000,
            params: cronParams,
            status: 'stopped'
       };
       let CronProcessModel = require('./app/models/mysql/CronProcesses'),
       cronProcessObj = new CronProcessModel();
       cronProcessObj.insertRecord(insertParams);
     })();
       
     promiseArray.push(p18);          
            
    return Promise.all(promiseArray);
}

addCronProcessEntries().then(function() {
  console.log('Entries made successfully.');
})
```
