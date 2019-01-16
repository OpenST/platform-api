# Cron Process Seed (for local setup)

* Create entry for blockParser.
```js
var cronParams = '{"startBlockNumber": -1, "endBlockNumber": -1, "intentionalBlockDelay": 0, "chainId":2000}',
  insertParams = {
    id: 1,
    kind: 'blockParser',
    ip_address: '127.0.0.1',
    chain_id: 2000,
    params: cronParams,
    status: 'stopped'
};
var CronProcessModel = require('./app/models/mysql/CronProcesses'),
cronProcessObj = new CronProcessModel();
cronProcessObj.insertRecord(insertParams).then(console.log).catch(console.log)
```

* Create entry for transactionParser.
```js
var cronParams = '{"prefetchCount": 25, "chainId":2000}',
  insertParams = {
    id: 2,
    kind: 'transactionParser',
    ip_address: '127.0.0.1',
    chain_id: 2000,
    params: cronParams,
    status: 'stopped'
};
var CronProcessModel = require('./app/models/mysql/CronProcesses'),
cronProcessObj = new CronProcessModel();
cronProcessObj.insertRecord(insertParams).then(console.log).catch(console.log)
```

* Create entry for Aux blockFinalizer.
```js
var cronParams = '{"blockDelay": 10, "chainId":2000}',
  insertParams = {
    id: 3,
    kind: 'blockFinalizer',
    ip_address: '127.0.0.1',
    chain_id: 2000,
    params: cronParams,
    status: 'stopped'
};
var CronProcessModel = require('./app/models/mysql/CronProcesses'),
cronProcessObj = new CronProcessModel();
cronProcessObj.insertRecord(insertParams).then(console.log).catch(console.log)
```

* Create entry for Origin blockFinalizer.
```js
var cronParams = '{"blockDelay": 10, "chainId":1000}',
  insertParams = {
    id: 6,
    kind: 'blockFinalizer',
    ip_address: '127.0.0.1',
    chain_id: 1000,
    params: cronParams,
    status: 'stopped'
};
var CronProcessModel = require('./app/models/mysql/CronProcesses'),
cronProcessObj = new CronProcessModel();
cronProcessObj.insertRecord(insertParams).then(console.log).catch(console.log)
```

* Create entry for economyAggregator.
```js
var cronParams = '{"prefetchCount": 1}',
  insertParams = {
    id: 4,
    kind: 'economyAggregator',
    ip_address: '127.0.0.1',
    chain_id: 2000,
    params: cronParams,
    status: 'stopped'
};
var CronProcessModel = require('./app/models/mysql/CronProcesses'),
cronProcessObj = new CronProcessModel();
cronProcessObj.insertRecord(insertParams).then(console.log).catch(console.log)
```

* Create entry for workflowWorker.
```js
var cronParams = '{"prefetchCount": 25}',
  insertParams = {
    id: 5,
    kind: 'workflowWorker',
    ip_address: '127.0.0.1',
    chain_id: 2000,
    params: cronParams,
    status: 'stopped'
};
var CronProcessModel = require('./app/models/mysql/CronProcesses'),
cronProcessObj = new CronProcessModel();
cronProcessObj.insertRecord(insertParams).then(console.log).catch(console.log)
```