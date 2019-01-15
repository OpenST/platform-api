# Config Strategy Seed (for local setup)

Create entry in encryption_salts to be used for encrypting the config strategy
```
source set_env_vars.sh
node executables/createEncryptionSalt
```

Create entry in config_groups table
```js
var insertParams = {
  "chainId": 0,
  "groupId": 0
};
var ConfigGroupsModel = require('./app/models/mysql/ConfigGroup'),
configGroupsObject = new ConfigGroupsModel();
configGroupsObject.insertRecord(insertParams).then(console.log).catch(console.log)
```

## Insert required config strategies
Global Memcache config strategy
```js
var globalMemcachedConfigDetails = {
  "globalMemcached": {
    "engine": "memcached",
    "servers": [
      "127.0.0.1:11211"
    ],
    "defaultTtl": 36000,
    "consistentBehavior": "1"
  }
};
var ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
new ConfigStrategyCrud(0, 0).addForKind('globalMemcached', globalMemcachedConfigDetails, 1);
```

Global RabbitMQ config strategy
```js
globalRabbitmqDetails = {
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
var ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
new ConfigStrategyCrud(0, 0).addForKind('globalRabbitmq', globalRabbitmqDetails, 1);
```

Global Nonce Memcache config strategy
```js
var globalNonceMemcachedConfigDetails = {
  "globalNonceMemcached": {
    "engine": "memcached",
    "servers": [
      "127.0.0.1:11211"
    ],
    "defaultTtl": 36000,
    "consistentBehavior": "1"
  }
};
var ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
new ConfigStrategyCrud(0, 0).addForKind('globalNonceMemcached', globalNonceMemcachedConfigDetails, 1);
```

Global DynamoDB config strategy
```js
var globalDynamodbConfigDetails = {
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

var ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
new ConfigStrategyCrud(0, 0).addForKind('globalDynamodb', globalDynamodbConfigDetails, 1);
```

In Memory Cache config strategy
```js
var inMemoryCacheDetails = {
  "inMemoryCache": {
    "engine": "none",
    "defaultTtl": 60,
    "namespace": "A",
    "consistentBehavior": "1"
  }
};
var ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
new ConfigStrategyCrud(0, 0).addForKind('inMemoryCache', inMemoryCacheDetails, 1);
```

Origin Geth config strategy
```js
var originGethDetails = {
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
    "chainId": 1000,
    "client": "geth"
  }
};
var ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
new ConfigStrategyCrud(0, 0).addForKind('originGeth', originGethDetails, 1);
```

Chain specific memcache config strategy
```js
var memcachedConfigDetails = {
  "memcached": {
    "engine": "memcached",
    "servers": [
      "127.0.0.1:11211"
    ],
    "defaultTtl": 36000,
    "consistentBehavior": "1"
  }
};
var ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
new ConfigStrategyCrud(2000, 1).addForKind('memcached', memcachedConfigDetails, 1);
```

Aux Geth config strategy
```js
var auxGethDetails = {
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
    "chainId": 2000,
    "client": "geth"
  }
};
var ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
new ConfigStrategyCrud(2000, 1).addForKind('auxGeth', auxGethDetails, 1);
```

Constants config strategy.
```js
constantDetails = {
  "constants": {
    "originChainId": 1000,
    "originDdbTablePrefix": "de_mn_",
    "auxDdbTablePrefix": "de_ma_"
  }
}
var ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
new ConfigStrategyCrud(0, 0).addForKind('constants', constantDetails, 1);
```

Origin Chain specific dynamoDB config 
```js
var dynamoConfigDetails = {
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

var ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
new ConfigStrategyCrud(1000, 1).addForKind('dynamodb', dynamoConfigDetails, 1);
```

Aux Chain specific dynamoDB config
```js
var dynamoConfigDetails = {
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

var ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
new ConfigStrategyCrud(2000, 1).addForKind('dynamodb', dynamoConfigDetails, 1)
```

Activating global config
```js
var ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
new ConfigStrategyCrud(0, 0).activate();
```

Activating chain specific config
```js
var ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
new ConfigStrategyCrud(2000, 1).activate();
```