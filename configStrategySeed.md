# Config Strategy Seed (for local setup)

Create entry in encryption_salts to be used for encrypting the config strategy
```
node executables/createEncryptionSalt
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
let ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId')
new ConfigStrategyCrud(0, 0).addForKind('originGeth', originGethDetails, 1)
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
    "gethPort": 30310,
    "networkId": 1000
  }
};
ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
new ConfigStrategyCrud(0, 0).addForKind('originConstants', originConstantDetails, 1);
```

AuxConstants config strategy
```js
let auxConstantDetails = {
  "auxConstants": {
    "gethPort": 30311,
    "networkId": 2000
  }
};
ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId');
new ConfigStrategyCrud(2000, 1).addForKind('auxConstants', auxConstantDetails, 1);
```

Activating global config
```js
let ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId')
new ConfigStrategyCrud(0, 0).activate()
```

Activating chain specific config
```js
let ConfigStrategyCrud = require('./helpers/configStrategy/ByChainId')
new ConfigStrategyCrud(2000, 1).activate()
```