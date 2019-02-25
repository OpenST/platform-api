# ORIGIN CHAIN SETUP

## Seed config strategy

* Global Configs Seed
```bash
    source set_env_vars.sh
    ./devops/exec/configStrategy.js --add-global-configs

    # Note: For staging and production follow help
```

* Activate Global Configs
```bash
    source set_env_vars.sh
    ./devops/exec/configStrategy.js --activate-configs --chain-id 0 --group-id 0
```

## Create common tables for SAAS DDB

* Create all SAAS Owned DDB Tables - (shards and shard_by_tokens)
```bash
    source set_env_vars.sh
    node executables/setup/origin/saasDdb.js
```

## Create common tables for Origin Block Scanner DDB
* Create Tables
```bash
    source set_env_vars.sh
    node executables/setup/blockScanner/initialSetup.js --chainId 1000
```

## Create sharded tables for Origin Block Scanner DDB
```bash
    node executables/setup/blockScanner/addChain.js --chainId 1000 --networkId 1000 --blockShardCount 1 --transactionShardCount 1 --economyShardCount 2 --economyAddressShardCount 2 
```

## Origin Chain Setup

#### [Only DevOps] NOTE: Make sure you review SA_DEFAULT_ORIGIN_GAS_PRICE gas price from https://ethgasstation.info/txPoolReport.php, as dynamic gas price cron is not yet active.

* Generate master internal funder address for this ENV
```bash
    source set_env_vars.sh
    node devops/exec/chainSetup.js --generate-master-internal-funder-address --chain-id 1000
```

* [Only Development] Get ETH funder private key
```js
let address = '0xc19f87b84723e14d438419c078123489a1952653'; // master internal funder address
let rootPrefix = '.';
addressPrivateKeyCache = new (require(rootPrefix + '/lib/cacheManagement/shared/AddressPrivateKey'))({ address: address});
addressPrivateKeyCache.fetchDecryptedData().then(function (res) {console.log("ETH Owner PK: ", res.data.private_key_d)});
```
NOTE: Copy the ETH funder private key for later use.

* [Only Development] Setup Origin GETH and fund necessary addresses.
```bash
    source set_env_vars.sh
    node tools/localSetup/origin/setupGeth.js --originChainId 1000
```

* [Only Development] Start Origin GETH with this script.
```bash
    sh ~/openst-setup/bin/origin-1000/origin-chain-1000.sh
```

* [Only DevOps] Fund master internal funder address (EXCEPT PRODUCTION MAIN ENV)
```bash
    source set_env_vars.sh
    node devops/exec/chainSetup.js --fund-master-internal-funder-address --chain-id 3 --eth-owner-private-key '0x0as..' --amount 10
```

* Generate origin address and fund them
```bash
    source set_env_vars.sh
    node devops/exec/chainSetup.js --generate-origin-addresses --chain-id 1000
```

* Setup Simple Token (EXCEPT PRODUCTION MAIN ENV)
```bash
    source set_env_vars.sh
    node executables/setup/origin/exceptProductionMain.js --originChainId 1000 --ethOwnerPrivateKey '0xabc...'
```

NOTE: Copy the 'Setup Simple Token response' from the script response above and save somewhere offline.

* Use Simple token Owner Private Key obtained from previous step, to run following command [ONLY FOR SANDBOX].
Granter address gets ETH and OST in this step.
```bash
    source set_env_vars.sh
    node executables/setup/origin/fundGranterAddress.js --stOwnerPrivateKey '0x10...' --ethOwnerPrivateKey '0x3d...' --stAmount 10000 --ethAmount 50
```

* Save simple token admin and owner addresses in database.
```bash
    source set_env_vars.sh
    node executables/setup/origin/saveSimpleTokenAddresses.js --admin '0xabc...' --owner '0xabc...'
```

* Fund master internal funder with OSTs (EXCEPT PRODUCTION MAIN ENV)
    - For non-development environment, use [MyEtherWallet](https://www.myetherwallet.com/#send-transaction), to fund address with OST.
    - otherwise, run following script to fund chain owner with OSTs (pass ST Owner private key in parameter)
```bash
    source set_env_vars.sh
    node executables/setup/origin/fundMasterInternalFunderAddress.js --stOwnerPrivateKey '0xabc...'
```

* Setup Origin Contracts
```bash
    source set_env_vars.sh
    node executables/setup/origin/contracts.js --originChainId 1000
```

#### [Only DevOps] NOTE: Revert SA_DEFAULT_ORIGIN_GAS_PRICE gas price

* Verifier script for origin chain setup
    - You can verify local chain setup and contract deployment using following scripts.
```bash
    source set_env_vars.sh
    node tools/verifiers/originChainSetup.js
```

* [Only Development] Seed the cron processes which are unique in a sub-environment using this script.
```bash
    source set_env_vars.sh
    node tools/localSetup/subEnvSpecificCronSeeder.js
```

* [Only Development] Seed the cron processes which are associated to origin chain using this script.
```bash
    source set_env_vars.sh
    node tools/localSetup/originChainSpecificCronSeeder.js
```

### Insert Pricer ABI into rules table
``` bash
> source set_env_vars.sh
> node
    InsertPricerAbiKlass = require('./lib/setup/InsertPricerAbiIntoRulesTable.js');
    new InsertPricerAbiKlass().perform().then(console.log).catch(console.log)
```

### Create entry in DDB table for highest block on origin chain.
```bash
    source set_env_vars.sh
    node executables/oneTimers/insertInDDBForOriginHighestBlock.js
```

### Run block-scanner crons and factory

* Start Workflow router factory
```bash
  source set_env_vars.sh
  node executables/workflowFactory.js --cronProcessId 1
```

* Run Origin Transaction Parser
```bash
  source set_env_vars.sh
  node executables/blockScanner/transactionParser.js --cronProcessId 5
```

* Run Origin Block Parser
```bash
  source set_env_vars.sh
  node executables/blockScanner/blockParser.js --cronProcessId 4
```

* Run Origin Finalizer
```bash
  source set_env_vars.sh
  node executables/blockScanner/finalizer.js --cronProcessId 6
```

### Funding crons
* Fund by master internal funder origin chain specific
```bash
  source set_env_vars.sh
  node executables/funding/byMasterInternalFunder/originChainSpecific.js --cronProcessId 7 //TODO-FUNDING: Wrong addresses funded here?
```
