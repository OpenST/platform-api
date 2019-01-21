# Config Strategy Seed (for local setup)

Create entry in encryption_salts to be used for encrypting the config strategy
```bash
source set_env_vars.sh
node executables/createEncryptionSalt
```

## Global Config
```js
let originChainId = 1000;
let globalChainId = 0;
let globalGroupId = 0;

function addGlobalConfig() {
  let promiseArray = [];
  
  // Global Memcache config strategy
  let p1 = (function insertGlobalMemcache() {
    let globalMemcachedConfigDetails = {
      "globalMemcached": {
        "engine": "memcached",
        "servers": [
          "127.0.0.1:11211"
        ],
        "defaultTtl": 36000,
        "consistentBehavior": "1"
      }
    };
    let ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
    return new ConfigStrategyCrud(globalChainId, globalGroupId).addForKind('globalMemcached', globalMemcachedConfigDetails, 1);
  })();
  
  promiseArray.push(p1);
  
  // Global RabbitMQ config strategy
  let p2 = (function insertGlobalRabbitmq() {
    let globalRabbitmqDetails = {
      "globalRabbitmq": {
        "username": "guest",
        "password": "guest",
        "host": "127.0.0.1",
        "port": "5672",
        "heartbeats": "30",
        "clusterNodes": [
          "127.0.0.1"
        ]
      }
    };
    let ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
    return new ConfigStrategyCrud(globalChainId, globalGroupId).addForKind('globalRabbitmq', globalRabbitmqDetails, 1);
  })();
  
  promiseArray.push(p2);
  
  // Global Nonce Memcache config strategy
  let p3 = (function insertGlobalNonceMemcache() {
    let globalNonceMemcachedConfigDetails = {
      "globalNonceMemcached": {
        "engine": "memcached",
        "servers": [
          "127.0.0.1:11211"
        ],
        "defaultTtl": 36000,
        "consistentBehavior": "1"
      }
    };
    let ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
    return new ConfigStrategyCrud(globalChainId, globalGroupId).addForKind('globalNonceMemcached', globalNonceMemcachedConfigDetails, 1);
  })();
  
  promiseArray.push(p3);
  
  // Global DynamoDB config strategy
  let p4 = (function insertGlobalDynamoDb() {
    let globalDynamodbConfigDetails = {
      "globalDynamodb": {
        "endpoint": "http://localhost:8000",
        "region": "localhost",
        "apiKey": "X",
        "apiSecret": "X",
        "apiVersion": "2012-08-10",
        "enableSsl": "0",
        "enableLogging": "0",
        "enableAutoscaling": "0",
        "maxRetryCount": "1",
        "autoScaling": {
          "endpoint": "http://localhost:8000",
          "region": "localhost",
          "apiKey": "X",
          "apiSecret": "X",
          "apiVersion": "2012-08-10",
          "enableSsl": "0"
        }
      }
    };
    
    let ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
    return new ConfigStrategyCrud(globalChainId, globalGroupId).addForKind('globalDynamodb', globalDynamodbConfigDetails, 1);
  })();
  
  promiseArray.push(p4);
  
  // In Memory Cache config strategy
  let p5 = (function insertInmemory() {
    let inMemoryCacheDetails = {
      "inMemoryCache": {
        "engine": "none",
        "defaultTtl": 60,
        "namespace": "A",
        "consistentBehavior": "1"
      }
    };
    let ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
    new ConfigStrategyCrud(globalChainId, globalGroupId).addForKind('inMemoryCache', inMemoryCacheDetails, 1);
  })();
  
  promiseArray.push(p5);
  
  // Origin Geth config strategy
  let p6 = (function insertOriginGeth() {
    let originGethDetails = {
      "originGeth": {
        "readOnly": {
          "rpcProvider": "http://127.0.0.1:8545",
          "wsProvider": "ws://127.0.0.1:8546",
          "rpcProviders": [
            "http://127.0.0.1:8545"
          ],
          "wsProviders": [
            "ws://127.0.0.1:8546"
          ]
        },
        "readWrite": {
          "rpcProvider": "http://127.0.0.1:8545",
          "wsProvider": "ws://127.0.0.1:8546",
          "rpcProviders": [
            "http://127.0.0.1:8545"
          ],
          "wsProviders": [
            "ws://127.0.0.1:8546"
          ]
        },
        "chainId": originChainId,
        "client": "geth",
        "blockGenerationTime": 15,
        "finalizeAfterBlocks": 24
      }
    };
    let ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
    new ConfigStrategyCrud(globalChainId, globalGroupId).addForKind('originGeth', originGethDetails, 1);
  })();
  
  promiseArray.push(p6);
  
  // Constants config strategy.
  let p7 = (function insertConstants() {
    let constantDetails = {
      "constants": {
        "originChainId": originChainId,
        "originDdbTablePrefix": "de_mn_",
        "auxDdbTablePrefix": "de_ma_"
      }
    };
    let ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
    new ConfigStrategyCrud(globalChainId, globalGroupId).addForKind('constants', constantDetails, 1);
  })();
  
  promiseArray.push(p7);
  
  // Origin Chain specific dynamoDB config
  let p8 = (function insertOriginChainDynamoDb() {
    let originDynamoConfigDetails = {
      "originDynamo": {
        "endpoint": "http://localhost:8000",
        "region": "localhost",
        "apiKey": "X",
        "apiSecret": "X",
        "apiVersion": "2012-08-10",
        "enableSsl": "0",
        "enableLogging": "0",
        "enableAutoscaling": "0",
        "maxRetryCount": "1",
        "autoScaling": {
          "endpoint": "http://localhost:8000",
          "region": "localhost",
          "apiKey": "X",
          "apiSecret": "X",
          "apiVersion": "2012-08-10",
          "enableSsl": "0"
        }
      }
    };
    
    let ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
    new ConfigStrategyCrud(globalChainId, globalGroupId).addForKind('originDynamo', originDynamoConfigDetails, 1);
  })();
  
  promiseArray.push(p8);
  
  // Origin Memcache config strategy
    let p9 = (function insertOriginMemcache() {
      let originMemcachedConfigDetails = {
        "originMemcached": {
          "engine": "memcached",
          "servers": [
            "127.0.0.1:11211"
          ],
          "defaultTtl": 36000,
          "consistentBehavior": "1"
        }
      };
      let ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
      return new ConfigStrategyCrud(globalChainId, globalGroupId).addForKind('originMemcached', originMemcachedConfigDetails, 1);
    })();
    
    promiseArray.push(p9);
  
  return Promise.all(promiseArray).then(
    function activateGlobalConfig() {
      let ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
      new ConfigStrategyCrud(globalChainId, globalGroupId).activate();
    }
  );
};

addGlobalConfig().then(function() {
  console.log('Global Config Added')
});
```

## Aux Chain Config
```js
function addAuxConfig(auxChainId, auxGroupId) {
  let promiseArray = [];
  
  // Create entry in config_groups table
  function createConfigGroup() {
    let insertParams = {
      "chainId": auxChainId,
      "groupId": auxGroupId
    };
    let ConfigGroupsModel = require('./app/models/mysql/ConfigGroup');
    let configGroupsObject = new ConfigGroupsModel();
    return configGroupsObject.insertRecord(insertParams).then(console.log).catch(console.log)
  };
  
  promiseArray.push(createConfigGroup());
  
  // Chain specific memcache config strategy
  function insertChainSpecificMemcache() {
    let memcachedConfigDetails = {
      "memcached": {
        "engine": "memcached",
        "servers": [
          "127.0.0.1:11211"
        ],
        "defaultTtl": 36000,
        "consistentBehavior": "1"
      }
    };
    let ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
    return new ConfigStrategyCrud(auxChainId, 1).addForKind('memcached', memcachedConfigDetails, 1);
  };
  
  promiseArray.push(insertChainSpecificMemcache());
  
  // Aux Geth config strategy
  function insertAuxGeth() {
    let auxGethDetails = {
      "auxGeth": {
        "readOnly": {
          "rpcProvider": "http://127.0.0.1:9545",
          "wsProvider": "ws://127.0.0.1:9546",
          "rpcProviders": [
            "http://127.0.0.1:9545"
          ],
          "wsProviders": [
            "ws://127.0.0.1:9546"
          ]
        },
        "readWrite": {
          "rpcProvider": "http://127.0.0.1:9545",
          "wsProvider": "ws://127.0.0.1:9546",
          "rpcProviders": [
            "http://127.0.0.1:9545"
          ],
          "wsProviders": [
            "ws://127.0.0.1:9546"
          ]
        },
        "chainId": auxChainId,
        "client": "geth",
        "blockGenerationTime": 3,
        "finalizeAfterBlocks": 6
      }
    };
    let ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
    return new ConfigStrategyCrud(auxChainId, auxGroupId).addForKind('auxGeth', auxGethDetails, 1);
  };
  
  promiseArray.push(insertAuxGeth());
  
  // Aux Chain specific dynamoDB config
  function insertChainSpecificDynamoDb() {
    let dynamoConfigDetails = {
      "dynamodb": {
        "endpoint": "http://localhost:8000",
        "region": "localhost",
        "apiKey": "X",
        "apiSecret": "X",
        "apiVersion": "2012-08-10",
        "enableSsl": "0",
        "enableLogging": "0",
        "enableAutoscaling": "0",
        "maxRetryCount": "1",
        "autoScaling": {
          "endpoint": "http://localhost:8000",
          "region": "localhost",
          "apiKey": "X",
          "apiSecret": "X",
          "apiVersion": "2012-08-10",
          "enableSsl": "0"
        }
      }
    };
    
    let ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
    return new ConfigStrategyCrud(auxChainId, auxGroupId).addForKind('dynamodb', dynamoConfigDetails, 1);
  };
  
  promiseArray.push(insertChainSpecificDynamoDb());
  
  // Activating chain specific config
  return Promise.all(promiseArray)
    .then(function activateChainSpecificConfig() {
              let ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
              new ConfigStrategyCrud(auxChainId, auxGroupId).activate();
            });
};

addAuxConfig(2000, 1).then(function() {
  console.log('Chain Specific Config Added')
});
```