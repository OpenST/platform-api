# Pre Setup

* Setup Kit API. Instructions are published at:  
  https://github.com/OpenSTFoundation/kit-api/blob/master/README.md

# saas-api

### Setup
Install all the packages.
```
npm install
```

* Source all the ENV vars.
```bash
source set_env_vars.sh
```

### Config Strategies Creation

- Seed the [config strategy](https://github.com/OpenSTFoundation/saas-api/blob/master/configStrategySeed.md) table.

### Local Chain Setup

* Setup Origin GETH and fund necessary addresses.
```bash
> source set_env_vars.sh
> node executables/setup/origin/gethAndAddresses.js --originChainId 1000
```

* Start Origin GETH with this script.
```bash
> sh ~/openst-setup/bin/origin-1000/origin-chain-1000.sh
```

* Setup Simple Token (only for non production_main env)
```bash
> source set_env_vars.sh
> node executables/setup/origin/simpleToken.js --originChainId 1000
```

* Setup Origin Contracts
```bash
> source set_env_vars.sh
> node executables/setup/origin/contracts.js --originChainId 1000
```

* Setup Aux GETH and necessary addresses
```bash
> source set_env_vars.sh
> node executables/setup/aux/gethAndAddresses.js --originChainId 1000 --auxChainId 2000
```

* Start AUX GETH with this script.
```bash
> sh ~/openst-setup/bin/aux-2000/aux-chain-2000.sh
```

* Setup Aux Contracts
```bash
> source set_env_vars.sh
> node executables/setup/aux/contracts.js --originChainId 1000 --auxChainId 2000
```

* Verification Scripts
- You can verify local chain setup and contract deployment using following scripts.
```bash
> source set_env_vars.sh
> node tools/verifiers/originChainSetup.js
> node tools/verifiers/auxChainSetup.js --auxChainId 2000
```
### Local Token Setup
* Create entry in tokens table.
```bash
>  cd kit-api
>  source set_env_vars.sh
>  rails c 
    params = {client_id:1,name:"tst5",symbol:"tst5",conversion_factor:0.8}
    TokenManagement::InsertTokenDetails.new(params).perform
```

* Create entry in cron_process table.
```bash
>  cd saas-api
>  source set_env_vars.sh
>  cronProcessesModelKlass = require('./app/models/mysql/CronProcesses')
   cronProcessModel = new cronProcessesModelKlass();
   cronParams = {"prefetchCount":"25"}
   
   params = {
      'kind':'workflowWorker',
      'ip_address':'127.0.0.1',
      'status':'stopped',
      'chain_id':2000,
      params: JSON.stringify(cronParams)
   }
   cronProcessModel.insertRecord(params).then(console.log)
```

* Start factory
```bash
> node executables/workflowRouter/factory.js --cronProcessId 1
```

* Start Economy Setup
```bash
> node
   params = {
       stepKind: 'economySetupInit',
       taskStatus: 'taskReadyToStart',
       clientId: 1,
       chainId: 2000,
       topic: 'workflow.economySetup',
       requestParams: {tokenId: 1, chainId: 2000, clientId: 1}
   }
   economySetupRouterK = require('./executables/workflowRouter/economySetupRouter.js')
   economySetupRouter = new economySetupRouterK(params)
   
   economySetupRouter.perform().then(console.log).catch(function(err){console.log('--------------err--', err)})
```