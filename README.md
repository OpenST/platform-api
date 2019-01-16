# Saas API
Saas API layer.

## Kit API Setup
* Instructions are published at:  
  https://github.com/OpenSTFoundation/kit-api/blob/master/README.md

## Setup
* Install all the packages.
```
npm install
```

* Source all the ENV vars.
```bash
source set_env_vars.sh
```

* Seed the [config strategy](https://github.com/OpenSTFoundation/saas-api/blob/master/configStrategySeed.md) table.

* Seed the [cron_process](https://github.com/OpenSTFoundation/saas-api/blob/master/cronProcessSeed.md) table.

### Origin Chain Setup

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

for production main, give a provision to add addresses of simple token and its admin.

* Setup Origin Contracts
```bash
> source set_env_vars.sh
> node executables/setup/origin/contracts.js --originChainId 1000
```

### Auxiliary Chain Setup

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

### Verifier scripts
* You can verify local chain setup and contract deployment using following scripts.
```bash
> source set_env_vars.sh
> node tools/verifiers/originChainSetup.js
> node tools/verifiers/auxChainSetup.js --auxChainId 2000
```
### Token Setup
* Create entry in tokens table.
```bash
>  cd kit-api
>  source set_env_vars.sh
>  rails c 
    params = {client_id:1,name:"tst5",symbol:"tst5",conversion_factor:0.8}
    TokenManagement::InsertTokenDetails.new(params).perform
```

* Make sure you have created entry for 'workflowWorker' in cron processes table.

* Start factory
```bash
> node executables/workflowRouter/factory.js --cronProcessId 1
```

* Start Economy Setup
```bash
> source set_env_vars.sh
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
   
   economySetupRouter.perform().then(console.log).catch(function(err){console.log('err', err)})
```

### Block-scanner Setup

* You will need following for development environment setup.
    - [nodejs](https://nodejs.org/) >= 8.0.0
    - [Geth](https://github.com/ethereum/go-ethereum/) >=1.8.17
    - [Memcached](https://memcached.org/)
    - [DB Browser for SQLite](https://sqlitebrowser.org/)

* Run following command to start Dynamo DB.
  ```bash
  java -Djava.library.path=~/dynamodb_local_latest/DynamoDBLocal_lib/ -jar ~/dynamodb_local_latest/DynamoDBLocal.jar -sharedDb -dbPath ~/dynamodb_local_latest/
  ```

* Create all the shared tables by running the following script: 
    ```bash
    # For origin chain
    node tools/localSetup/block-scanner/initialSetup.js --chainId 1000
    # For auxiliary chain
    node tools/localSetup/block-scanner/initialSetup.js --chainId 2000
    ```
* Run the addChain service and pass all the necessary parameters:
    ```bash
    # For origin chain
    node tools/localSetup/block-scanner/addChain.js --chainId 1000 --networkId 1000 --blockShardCount 2 --economyShardCount 2 --economyAddressShardCount 2 --transactionShardCount 2
    # For auxiliary chain
    node tools/localSetup/block-scanner/addChain.js --chainId 2000 --networkId 2000 --blockShardCount 2 --economyShardCount 2 --economyAddressShardCount 2 --transactionShardCount 2
    ```
    * Mandatory parameters: chainId, networkId
    * Optional parameters (defaults to 1): blockShardCount, economyShardCount, economyAddressShardCount, transactionShardCount
   
