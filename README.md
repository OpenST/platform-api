# Saas API
Saas API layer.

## Kit API Setup
* Instructions are published at:  
  https://github.com/OpenSTFoundation/kit-api/blob/master/README.md

## Requirements
* You will need following for development environment setup.
    - [nodejs](https://nodejs.org/) >= 8.0.0
    - [Geth](https://github.com/ethereum/go-ethereum/) >= 1.8.20
    - [Memcached](https://memcached.org/)
    - [DB Browser for SQLite](https://sqlitebrowser.org/)

## Installing Geth
```
git clone https://github.com/ethereum/go-ethereum.git
cd go-ethereum
git checkout tags/v1.8.20
make geth
sudo cp ~/workspace/go-ethereum/build/bin/geth /usr/local/bin
```

## Setup
* Install all the packages.
```
npm install
```

* Source all the ENV vars.
```bash
source set_env_vars.sh
```

* Config Strategy Seed for Global configurations (for local setup)
```bash

# Add Global Configs
./devops/exec/configStrategy.js --add-global-configs

# Note: For staging and production follow help

```

* Config Strategy Seed for Auxiliary configurations (for local setup)
```bash
# Add Auxiliary Configs
./devops/exec/configStrategy.js --add-aux-configs

# Note: For staging and production follow help
```

* Update the 'is_available_for_allocation' status in 'config_groups' table to '1'.

* Activate configurations
```bash
# Activate Global configurations
./devops/exec/configStrategy.js --activate-configs --chain-id 0 --group-id 0

# Activate Auxiliary Chain configurations
./devops/exec/configStrategy.js --activate-configs --chain-id 2000 --group-id 2000
```

### Origin Chain Setup

* Setup Origin GETH and fund necessary addresses.
```bash
  source set_env_vars.sh
  node executables/setup/origin/gethAndAddresses.js --originChainId 1000
```

Copy the 'Generate Addresses Response' from the script response above and save somewhere offline.

* Start Origin GETH with this script.
```bash
  sh ~/openst-setup/bin/origin-1000/origin-chain-1000.sh
```

* Setup Simple Token (only for non production_main env)
```bash
  source set_env_vars.sh
  node executables/setup/origin/forNonProductionMain.js --originChainId 1000
```

Copy the 'Setup Simple Token response' from the script response above and save somewhere offline.

* Use Simple token Owner Private Key obtained from previous step, to run following command [only for dev-environment].
```bash
  source set_env_vars.sh
  node executables/setup/origin/onlyForDevEnv.js --stOwnerPrivateKey '0xabc...'
```

* Save simple token admin and owner addresses in database.
```bash
  source set_env_vars.sh
  node executables/setup/origin/SaveSimpleTokenAddresses.js --admin '0xabc...' --owner '0xabc...'
```

* Fund chain owner with OSTs (pass ST Owner private key in parameter)
    - For non-development environment, use [MyEtherWallet](https://www.myetherwallet.com/#send-transaction), to fund address with OST.
    - otherwise, run following script to fund chain owner with OSTs.
```bash
  source set_env_vars.sh
  node executables/setup/origin/fundChainOwner.js --funderPrivateKey '0xabc...'
```

* Setup Origin Contracts
```bash
  source set_env_vars.sh
  node executables/setup/origin/contracts.js --originChainId 1000
```

* Verifier script for origin chain setup
    - You can verify local chain setup and contract deployment using following scripts.
```bash
  source set_env_vars.sh
  node tools/verifiers/originChainSetup.js
```

### Auxiliary Chain Setup

* Setup Aux GETH and necessary addresses.
```bash
  source set_env_vars.sh
  node executables/setup/aux/gethAndAddresses.js --originChainId 1000 --auxChainId 2000
```

* Start AUX GETH with this script.
```bash
  sh ~/openst-setup/bin/aux-2000/aux-chain-2000.sh
```

* Add sealer address [Not for dev-environment].
```bash
  source set_env_vars.sh
  node executables/setup/aux/addSealerAddress.js --auxChainId 2000 --sealerAddress '0xabc...' --sealerPrivateKey '0xabc...'
```

* Setup Aux Contracts
```bash
  source set_env_vars.sh
  node executables/setup/aux/contracts.js --originChainId 1000 --auxChainId 2000
```

* Verifier script for auxiliary chain setup
    - You can verify local chain setup and contract deployment using following script.
```bash
  source set_env_vars.sh
  node tools/verifiers/auxChainSetup.js --auxChainId 2000
```

* Seed the [cron_process](https://github.com/OpenSTFoundation/saas-api/blob/master/cronProcessSeed.md) table.

### Block-scanner Setup

* Run following command to start Dynamo DB.
  ```bash
  java -Djava.library.path=~/dynamodb_local_latest/DynamoDBLocal_lib/ -jar ~/dynamodb_local_latest/DynamoDBLocal.jar -sharedDb -dbPath ~/dynamodb_local_latest/
  ```

* Create all the shared tables by running the following script: 
    ```bash
    source set_env_vars.sh
    # For origin chain
    node tools/localSetup/block-scanner/initialSetup.js --chainId 1000
    # For auxiliary chain
    node tools/localSetup/block-scanner/initialSetup.js --chainId 2000
    ```
* Run the addChain service and pass all the necessary parameters:
    ```bash
    source set_env_vars.sh
    # For origin chain
    node tools/localSetup/block-scanner/addChain.js --chainId 1000 --networkId 1000 --blockShardCount 2 --economyShardCount 2 --economyAddressShardCount 2 --transactionShardCount 2
    # For auxiliary chain
    node tools/localSetup/block-scanner/addChain.js --chainId 2000 --networkId 2000 --blockShardCount 2 --economyShardCount 2 --economyAddressShardCount 2 --transactionShardCount 2
    ```
    * Mandatory parameters: chainId, networkId
    * Optional parameters (defaults to 1): blockShardCount, economyShardCount, economyAddressShardCount, transactionShardCount
   
### Run block-scanner
* Run Block Parser
```bash
  source set_env_vars.sh
  node executables/blockScanner/BlockParser.js --cronProcessId 1
```

* Run Transaction Parser
```bash
  source set_env_vars.sh
  node executables/blockScanner/TransactionParser.js --cronProcessId 2
```

* Run Auxiliary Finalizer
```bash
  source set_env_vars.sh
  node executables/blockScanner/Finalizer.js --cronProcessId 3
```

* Run Origin Finalizer
```bash
  source set_env_vars.sh
  node executables/blockScanner/Finalizer.js --cronProcessId 6
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
  node executables/workflowRouter/factory.js --cronProcessId 5
```

* Temporary change
Add this code snippet at /saas-api/node_modules/@openstfoundation/mosaic-tbd/libs/Contracts.js
Line No 118
```bash
  else{
      return web3;
    }
```

* Start Economy Setup
```bash
let config = null;
rootPrefix = '.'
coreConstants = require(rootPrefix + '/config/coreConstants')

a = require('./helpers/configStrategy/ByChainId.js')
b = new a(2000,1);
b.getComplete().then(function(r) {config = r.data});

OSTBase = require('@openstfoundation/openst-base')
InstanceComposer = OSTBase.InstanceComposer
ic = new InstanceComposer(config)

require('./app/services/token/Deployment.js')

TokenDeployment = ic.getShadowedClassFor(coreConstants.icNameSpace,'TokenDeployment');

a = new TokenDeployment({token_id: 1011, client_id: 1})

a.perform().then(console.log)
```

* St' Stake and Mint
```bash
> source set_env_vars.sh
> node
   params = {
          stepKind: 'stPrimeStakeAndMintInit',
          taskStatus: 'taskReadyToStart',
          clientId: 0,
          chainId: 1000,
          topic: 'workflow.stPrimeStakeAndMint',
          requestParams: {stakerAddress: '0x462901a903d0D772E194497A9254238D01220D57', 
          originChainId: 1000, auxChainId: 2000, facilitator: '0x462901a903d0D772E194497A9254238D01220D57', 
          amountToStake: '1000000000000000000000', beneficiary: '0xB32C00C0b1532fa6BACA7F0dF065d3B8a3456cBf'}
      }
   stPrimeRouterK = require('./executables/workflowRouter/stakeAndMint/StPrimeRouter')
   stPrimeRouter = new stPrimeRouterK(params)
   
   stPrimeRouter.perform().then(console.log).catch(function(err){console.log('err', err)})
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
       requestParams: {tokenId: 1000, auxChainId: 2000, originChainId: 1000, chainId: 2000, clientId: 1}
   }
   economySetupRouterK = require('./executables/workflowRouter/EconomySetupRouter.js')
   economySetupRouter = new economySetupRouterK(params)
   
   economySetupRouter.perform().then(console.log).catch(function(err){console.log('err', err)})
```

* Start BT stake and mint
```bash
> source set_env_vars.sh
> node
    params = {
           stepKind: 'btStakeAndMintInit',
           taskStatus: 'taskReadyToStart',
           clientId: 1,
           chainId: 1000,
           topic: 'workflow.btStakeAndMint',
           requestParams: {
           tokenId: 1, chainId: 1000, auxChainId: 2000, originChainId: 1000, 
           clientId: 1, 
           requestStakeTransactionHash: '0xbc0ee0b2b71c46db08b7e7307a87d46b3084e36a32a9d311b050ee23ea7e1cab', 
           approveTransactionHash: '0x1821f4bbaa7370402bed2de6c03780cddb0e7a41074100a3ebb138adce4ff958', 
           stakerAddress: '0xd1abbdccc3dfa2a80a6e99da97339a5f12ed911e', 
           simpleTokenContract: '0xab5f71b354f75701bb4e7443dda1784f89b1b442', 
           stakeAmount: '1000000'
           }
       }
    BrandedTokenMintRouter = require('./executables/workflowRouter/stakeAndMint/brandedTokenRouter.js')
    brandedTokenMintRouter = new BrandedTokenMintRouter(params)
    brandedTokenMintRouter.perform().then(console.log)
```