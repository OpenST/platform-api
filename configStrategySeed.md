# Config Strategy Seed (for local setup)

Create entry in encryption_salts to be used for encrypting the config strategy
```
source set_env_vars.sh
node executables/createEncryptionSalt
```

Create entry in config_groups table
```js
let insertParams = {
  "chainId": 0,
  "groupId": 0
};
let ConfigGroupsModel = require('./app/models/mysql/ConfigGroup'),
configGroupsObject = new ConfigGroupsModel();
configGroupsObject.insertRecord(insertParams).then(console.log).catch(console.log)
```

## Insert required config strategies
Global Memcache config strategy
```js
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
new ConfigStrategyCrud(0, 0).addForKind('globalMemcached', globalMemcachedConfigDetails, 1);
```

Global Nonce Memcache config strategy
```js
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
new ConfigStrategyCrud(0, 0).addForKind('globalNonceMemcached', globalNonceMemcachedConfigDetails, 1);
```

In Memory Cache config strategy
```js
let inMemoryCacheDetails = {
  "inMemoryCache": {
    "engine": "none",
    "defaultTtl": 60,
    "namespace": "A",
    "consistentBehavior": "1"
  }
};
let ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
new ConfigStrategyCrud(0, 0).addForKind('inMemoryCache', inMemoryCacheDetails, 1);
```

Origin Geth config strategy
```js
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
    "chainId": 1000,
    "client": "geth"
  }
};
let ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
new ConfigStrategyCrud(0, 0).addForKind('originGeth', originGethDetails, 1);
```

Chain specific memcache config strategy
```js
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
new ConfigStrategyCrud(2000, 1).addForKind('memcached', memcachedConfigDetails, 1);
```

Aux Geth config strategy
```js
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
    "chainId": 2000,
    "client": "geth"
  }
};
let ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
new ConfigStrategyCrud(2000, 1).addForKind('auxGeth', auxGethDetails, 1);
```

OriginConstants config strategy
```js
let originConstantDetails = {
  "originConstants": {
    "placeHolder1": "placeHolder1Value",
    "placeHolder2": "placeHolder2Value"
  }
};
ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
new ConfigStrategyCrud(0, 0).addForKind('originConstants', originConstantDetails, 1);
```

AuxConstants config strategy
```js
let auxConstantDetails = {
  "auxConstants": {
    "placeHolder3": "placeHolder3Value",
    "placeHolder4": "placeHolder4Value"
  }
};
ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
new ConfigStrategyCrud(2000, 1).addForKind('auxConstants', auxConstantDetails, 1);
```

```js
let dynamoConfigDetails = {
  "dynamodb": {
    "endpoint": "http://localhost:8000",
    "region": "localhost",
    "apiKey": "X",
    "apiSecret": "pweoiureugfd3298yreuhdjksm",
    "apiVersion": "2012-08-10",
    "enableSsl": "0",
    "tablePrefix": "de_ma_",
    "enableLogging": "0",
    "enableAutoscaling": "0",
    "maxRetryCount": "1",
    "autoScaling": {
      "endpoint": "http://localhost:8000",
      "region": "localhost",
      "apiKey": "X",
      "apiSecret": "eridsklcxmedsfhkljdsnvcxuiwedsjckx",
      "apiVersion": "2012-08-10",
      "enableSsl": "0"
    }
  }
};

let ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId')
new ConfigStrategyCrud(2000, 10).addForKind('dynamodb', dynamoConfigDetails, 1)
```

```js
let dynamoConfigDetails = {
  "dynamodb": {
    "endpoint": "http://localhost:8000",
    "region": "localhost",
    "apiKey": "X",
    "apiSecret": "pweoiureugfd3298yreuhdjksm",
    "apiVersion": "2012-08-10",
    "enableSsl": "0",
    "tablePrefix": "de_ma_",
    "enableLogging": "0",
    "enableAutoscaling": "0",
    "maxRetryCount": "1",
    "autoScaling": {
      "endpoint": "http://localhost:8000",
      "region": "localhost",
      "apiKey": "X",
      "apiSecret": "eridsklcxmedsfhkljdsnvcxuiwedsjckx",
      "apiVersion": "2012-08-10",
      "enableSsl": "0"
    }
  }
};

let ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId')
new ConfigStrategyCrud(1000, 10).addForKind('dynamodb', dynamoConfigDetails, 1)
```

```js
let dynamoConfigDetails = {
  "dynamodb": {
    "endpoint": "http://localhost:8000",
    "region": "localhost",
    "apiKey": "X",
    "apiSecret": "pweoiureugfd3298yreuhdjksm",
    "apiVersion": "2012-08-10",
    "enableSsl": "0",
    "tablePrefix": "de_ma_",
    "enableLogging": "0",
    "enableAutoscaling": "0",
    "maxRetryCount": "1",
    "autoScaling": {
      "endpoint": "http://localhost:8000",
      "region": "localhost",
      "apiKey": "X",
      "apiSecret": "eridsklcxmedsfhkljdsnvcxuiwedsjckx",
      "apiVersion": "2012-08-10",
      "enableSsl": "0"
    }
  }
};

let ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId')
new ConfigStrategyCrud(0, 10).addForKind('dynamodb', dynamoConfigDetails, 1)
```

Activating global config
```js
let ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
new ConfigStrategyCrud(0, 0).activate();
```

Activating chain specific config
```js
let ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
new ConfigStrategyCrud(2000, 1).activate();
```