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

## Start RabbitMQ
```
brew services start rabbitmq
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

## Seed config strategy for origin as well as auxiliary chain.

* Clear cache.
```bash
node  executables/flush/sharedMemcached.js
```

* Config Strategy Seed for Global configurations (for local setup)
```bash

# Add Global Configs
./devops/exec/configStrategy.js --add-global-configs

# Note: For staging and production follow help

```

* Activate configurations
```bash
# Activate Global configurations
./devops/exec/configStrategy.js --activate-configs --chain-id 0 --group-id 0
```

* Config Strategy Seed for Auxiliary configurations (for local setup)
```bash
# Add Auxiliary Configs
./devops/exec/configStrategy.js --add-aux-configs

# Note: For staging and production follow help
```

* Activate configurations
```bash
# Activate Auxiliary Chain configurations
./devops/exec/configStrategy.js --activate-configs --chain-id 2000 --group-id 2000
```


## Start Dynamo DB
```bash
java -Djava.library.path=~/dynamodb_local_latest/DynamoDBLocal_lib/ -jar ~/dynamodb_local_latest/DynamoDBLocal.jar -sharedDb -dbPath ~/dynamodb_local_latest/
```

### Block-scanner Setup

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

### Origin Chain Setup

* Setup Origin GETH and fund necessary addresses.
```bash
  source set_env_vars.sh
  node executables/setup/origin/gethAndAddresses.js --originChainId 1000
  
  # Do not worry about errors having code - l_c_m_i_4. These come due to cache miss.
```

* Start Origin GETH with this script.
```bash
  sh ~/openst-setup/bin/origin-1000/origin-chain-1000.sh
```

* Setup Simple Token (EXCEPT PRODUCTION MAIN ENV)
```bash
  source set_env_vars.sh
  node executables/setup/origin/exceptProductionMain.js --originChainId 1000
  
  # Do not worry about errors having code - l_c_m_i_4. These come due to cache miss.
```

Copy the 'Setup Simple Token response' from the script response above and save somewhere offline.

* Use Simple token Owner Private Key obtained from previous step, to run following command [only for dev-environment].
Granter address gets ETH and OST in this step.
```bash
  source set_env_vars.sh
  node executables/setup/origin/fundGranterAddress.js --stOwnerPrivateKey '0xabc...'
```

* Save simple token admin and owner addresses in database.
```bash
  source set_env_vars.sh
  node executables/setup/origin/saveSimpleTokenAddresses.js --admin '0xabc...' --owner '0xabc...'
```

* Fund master internal funder with OSTs
    - For non-development environment, use [MyEtherWallet](https://www.myetherwallet.com/#send-transaction), to fund address with OST.
    - otherwise, run following script to fund chain owner with OSTs (pass ST Owner private key in parameter)
```bash
  source set_env_vars.sh
  node executables/setup/origin/fundChainOwner.js --funderPrivateKey '0xabc...'
```

* Setup Origin Contracts
```bash
  source set_env_vars.sh
  node executables/setup/origin/contracts.js --originChainId 1000
  
  # Do not worry about errors having code - l_c_m_i_4. These come due to cache miss.
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

* Start AUX GETH (with Zero Gas Price) with this script.
```bash
  sh ~/openst-setup/bin/aux-2000/aux-chain-zeroGas-2000.sh
```

* Add sealer address.  
NOTE: Use MyEtherWallet to export private key from keystore file. 
Visit the following link [MyEtherWallet](https://www.myetherwallet.com/#view-wallet-info) and select the `Keystore / JSON File` option. 
Upload the keystore file from `~/openst-setup/geth/aux-2000/keystore` folder. The unlock password is 
`testtest`. Pass the address and privateKey (including 0x) in the command below.

And add it to tables using following script.
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
   
### Run block-scanner

* [Only for devops] Create entry in DDB table for highest block on origin chain.

```bash
  source set_env_vars.sh
  node executables/oneTimers/insertInDDBForOriginHighestBlock.js
```

* Run Auxiliary Transaction Parser
```bash
  source set_env_vars.sh
  node executables/blockScanner/TransactionParser.js --cronProcessId 2
```

* Run Auxiliary Block Parser
```bash
  source set_env_vars.sh
  node executables/blockScanner/BlockParser.js --cronProcessId 1
```

* Run Auxiliary Finalizer
```bash
  source set_env_vars.sh
  node executables/blockScanner/Finalizer.js --cronProcessId 3
```

* Run Origin Transaction Parser
```bash
  source set_env_vars.sh
  node executables/blockScanner/TransactionParser.js --cronProcessId 8
```

* Run Origin Block Parser
```bash
  source set_env_vars.sh
  node executables/blockScanner/BlockParser.js --cronProcessId 7
```

* Run Origin Finalizer
```bash
  source set_env_vars.sh
  node executables/blockScanner/Finalizer.js --cronProcessId 6
```

* Start Workflow router factory
```bash
  source set_env_vars.sh
  node executables/workflowRouter/factory.js --cronProcessId 5
```

NOTE: Make sure to make `auxChainGasPrice` value to `0x0` in `\lib\globalConstant\contract.js` before starting ST Prime 
Stake and Mint on zero-gas.

//TODO: change amountToStake to amountToStakeInWei
* St' Stake and Mint
```bash
> source set_env_vars.sh
> node

  beneficiary -> chainOwnerKind
  facilitator -> chainOwnerKind of origin chain
  stakerAddress -> chainOwnerKind of origin chain
  
   params = {
          stepKind: 'stPrimeStakeAndMintInit',
          taskStatus: 'taskReadyToStart',
          clientId: 0,
          chainId: 1000,
          topic: 'workflow.stPrimeStakeAndMint',
          requestParams: {stakerAddress: '0x7bc30b33a53a61ae3090f8d129782a394a56bf9f', 
          originChainId: 1000, auxChainId: 2000, facilitator: '0xff477d285ab4060165d070ae11663ee7a5f91b41', 
          amountToStake: '100000000000000000000', beneficiary: '0x7bc30b33a53a61ae3090f8d129782a394a56bf9f'
          }
      }
   stPrimeRouterK = require('./executables/workflowRouter/stakeAndMint/StPrimeRouter')
   stPrimeRouter = new stPrimeRouterK(params)
   
   stPrimeRouter.perform().then(console.log).catch(function(err){console.log('err', err)})
```

* Stop geth running at zero gas price & Start AUX GETH (With Non Zero Gas Price) with this script.
```bash
  sh ~/openst-setup/bin/aux-2000/aux-chain-2000.sh
```

* Revert the auxChainGasPrice value back to the previous value.


### Open up config group for allocation
```js
let ConfigGroupModel = require('./app/models/mysql/ConfigGroup');
let auxChainId = 2000;
let auxGroupId = 2000;

ConfigGroupModel.markAsAvailableForAllocation(auxChainId, auxGroupId).then(console.log);
```

### Token Setup
* Create entry in tokens table.
```bash
>  cd kit-api
>  source set_env_vars.sh
>  rails c 
    params = {client_id:1,name:"KingFisher Ultra",symbol:"KFU",conversion_factor:0.8}
    TokenManagement::InsertTokenDetails.new(params).perform
```

* Start Economy Setup
```bash

TokenDeployment = require('./app/services/token/Deployment.js');
a = new TokenDeployment({token_id: 2, client_id: 2})
a.perform().then(console.log)
```

### Run Aggregator
```bash
  source set_env_vars.sh
  node executables/blockScanner/Aggregator.js --cronProcessId 4
```

### Funding crons
* Fund by chain owner origin chain specific
```bash
  source set_env_vars.sh
  node executables/funding/byChainOwner/originChainSpecific --cronProcessId 9
```

* Fund by sealer aux chain specific
```bash
  source set_env_vars.sh
  node executables/funding/bySealer/auxChainSpecific.js --cronProcessId 11
```

* Fund by chain owner aux chain specific chain addresses
```bash
  source set_env_vars.sh
  node executables/funding/byChainOwner/auxChainSpecific/chainAddresses.js --cronProcessId 10
```

* Fund by chain owner aux chain specific token funder addresses
```bash
  source set_env_vars.sh
  node executables/funding/byChainOwner/auxChainSpecific/tokenFunderAddresses.js --cronProcessId 15
```

* Fund by chain owner aux chain specific inter chain facilitator addresses on origin chain.
```bash
  source set_env_vars.sh
  node executables/funding/byChainOwner/auxChainSpecific/interChainFacilitatorAddresses.js --cronProcessId 16
```

* Fund by token aux funder aux chain specific
```bash
  source set_env_vars.sh
  node executables/funding/byTokenAuxFunder/auxChainSpecific.js --cronProcessId 12
```