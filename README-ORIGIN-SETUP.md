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

* Create all SAAS Owned DDB Tables - (shards, shard_by_tokens, and base_currencies)
```bash
    source set_env_vars.sh
    node executables/setup/origin/saasDdb.js
```

## Create common tables for Origin Block Scanner DDB
* Create Tables
```bash
    source set_env_vars.sh
    node executables/setup/blockScanner/initialSetup.js --chainId 3
```

## Create sharded tables for Origin Block Scanner DDB
```bash
    node executables/setup/blockScanner/addChain.js --chainId 3 --networkId 3 --blockShardCount 1 --transactionShardCount 1 --economyAddressShardCount 2 
```

## Origin Chain Setup

#### [Only DevOps] NOTE: Make sure you review SA_DEFAULT_ORIGIN_GAS_PRICE gas price from https://ethgasstation.info/txPoolReport.php, as dynamic gas price cron is not yet active.

* [Only Development] Add `127.0.0.1       ropsten.developmentost.com` in hosts files 
```bash
    sudo vim /etc/hosts
```

* Generate master internal funder address for this ENV
```bash
    source set_env_vars.sh
    node devops/exec/chainSetup.js --generate-master-internal-funder-address --chain-id 3
```

* [Only Development] Get ETH funder private key
```js
let address = '0x123___'; // master internal funder address
let rootPrefix = '.';
addressPrivateKeyCache = new (require(rootPrefix + '/lib/cacheManagement/shared/AddressPrivateKey'))({ address: address});
addressPrivateKeyCache.fetchDecryptedData().then(function (res) {console.log("ETH Owner(masterInternalFunder) PK: ", res.data.private_key_d)});
```
NOTE: Copy the ETH funder private key for later use.

* [Only Development] Setup Origin GETH and fund necessary addresses.	
```bash	
    source set_env_vars.sh	
    node tools/localSetup/origin/setupGeth.js --originChainId 3
```

* [Only Development] Start Origin GETH with this script.	
```bash	
    sh ~/openst-setup/bin/origin-3/origin-chain-3.sh
```

* [Only DevOps] Fund master internal funder address (EXCEPT PRODUCTION MAIN ENV)
```bash
    source set_env_vars.sh
    node devops/exec/chainSetup.js --fund-master-internal-funder-address --chain-id 3 --eth-owner-private-key '0x0a___' --amount 10
```

* Generate origin address and fund them.
```bash
    source set_env_vars.sh
    node devops/exec/chainSetup.js --generate-origin-addresses --chain-id 3
```

* Insert Simple Token Details in Stake Currencies Mysql Table
```bash
    source set_env_vars.sh
    node executables/setup/origin/insertInStakeCurrencies.js --contractSymbol OST --contractName "Simple Token"
```

* Insert Quote Currency Details in Quote Currencies Mysql Table
```bash
    source set_env_vars.sh
    node executables/setup/origin/insertInQuoteCurrencies.js --symbol USD --name "US Dollar"
```

```bash
    source set_env_vars.sh
    node executables/setup/origin/insertInQuoteCurrencies.js --symbol EUR --name "Euro"
```

```bash
    source set_env_vars.sh
    node executables/setup/origin/insertInQuoteCurrencies.js --symbol GBP --name "Great Britain Pound"
```

* Setup Simple Token (EXCEPT PRODUCTION MAIN ENV)
```bash
    source set_env_vars.sh
    node devops/exec/chainSetup.js --setup-simple-token --chain-id 3 --eth-owner-private-key '0xabc___'
```

NOTE: Copy the response from the script above and save somewhere offline.

* Update simple token contract details in stake currencies and insert in base currencies DDB table.
```bash
    source set_env_vars.sh
    node executables/setup/origin/saveStakeCurrencyDetails.js --contractSymbol OST --contractAddress '0xabc___'
```

* Save simple token admin, owner and contract address in database.
```bash
    source set_env_vars.sh
    node executables/setup/origin/saveSimpleTokenAddresses.js --admin '0xabc___' --owner '0xabc___'
```

* Insert USDC Details in Stake Currencies Mysql Table
```bash
    source set_env_vars.sh
    node executables/setup/origin/insertInStakeCurrencies.js --contractSymbol USDC --contractName "USD Coin"
```

* Setup USDC Token (EXCEPT PRODUCTION MAIN ENV)
```bash
    source set_env_vars.sh
    node devops/exec/chainSetup.js --setup-usdc-token --chain-id 3 --eth-owner-private-key '0xabc___'
```

NOTE: Copy the response from the script above and save somewhere offline.

* Mint sufficient USDC Tokens (EXCEPT PRODUCTION MAIN ENV)
```bash
    source set_env_vars.sh
    node executables/oneTimers/stableCoinStaking/mintUsdcToken.js --usdcTokenOwnerAddress "0xabc___" --usdcTokenOwnerPrivateKey "0xabc___" --usdcContractAddress "0xabc___" --usdcToMintInWei "200000000000000"
```

* Save USDC token owner address in database.
```bash
    source set_env_vars.sh
    node executables/setup/origin/saveUsdcTokenAddresses.js --owner '0xabc___'
```

* Update USDC token contract details in stake currencies and insert in base currencies DDB table.
```bash
    source set_env_vars.sh
    node executables/setup/origin/saveStakeCurrencyDetails.js --contractSymbol USDC --contractAddress '0xabc___'
```

* Use ETH Owner Private Key, to run following command. Granter address gets ETH in this step [ONLY FOR SANDBOX].
```bash
    source set_env_vars.sh
    node executables/setup/origin/fundGranterAddress.js --ethOwnerPrivateKey '0xab___' --ethAmount 50
```

* Use Simple token Owner Private Key, to run following command. Granter address gets OST in this step [ONLY FOR SANDBOX].
```bash
    source set_env_vars.sh
    node executables/setup/origin/fundGranterAddress.js --stakeCurrencySymbol 'OST' --stakeCurrencyOwnerPrivateKey '0x3d___' --stakeCurrencyAmount 1000000
```

* Use USDC Owner Private Key, to run following command. Granter address gets USDC in this step [ONLY FOR SANDBOX].
```bash
    source set_env_vars.sh
    node executables/setup/origin/fundGranterAddress.js --stakeCurrencySymbol 'USDC' --stakeCurrencyOwnerPrivateKey '0x3d___' --stakeCurrencyAmount 1000000
```

* Fund master internal funder with OSTs (EXCEPT PRODUCTION MAIN ENV)
    - For non-development environment, use [MyEtherWallet](https://www.myetherwallet.com/#send-transaction), to fund address with OST.
    - Otherwise, run following script to fund chain owner with OSTs (pass ST Owner private key in parameter)
```bash
    source set_env_vars.sh
    node executables/setup/origin/fundMasterInternalFunderAddress.js --stOwnerPrivateKey '0xabc___'
```

* Setup Origin Contracts
```bash
    source set_env_vars.sh
    node executables/setup/origin/contracts.js --originChainId 3
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
    InsertRuleAbiKlass = require('./lib/setup/InsertRuleAbiIntoRulesTable.js');
    new InsertRuleAbiKlass().perform().then(console.log).catch(console.log)
```

### Create entry in DDB table for highest block on origin chain.
```bash
    source set_env_vars.sh
    node executables/oneTimers/insertInDDBForOriginHighestBlock.js
```

### [Only Development] Create `ost_infra` database and `error_logs` table.
```bash
   node executables/oneTimers/createOstInfraDatabase.js
   node executables/oneTimers/createErrorLogsTable.js
```

### [Only Development] Create `ost_analytics` database and `transaction_by_type_graph` and `transaction_by_type_graph` table.
```bash
   node executables/oneTimers/createOstAnalyticsDatabase.js
   node executables/oneTimers/createTransactionByNameGraphTable.js
   node executables/oneTimers/createTransactionByTypeGraphTable.js
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
  node executables/blockScanner/transactionParser.js --cronProcessId 8
```

* Run Origin Block Parser
```bash
  source set_env_vars.sh
  node executables/blockScanner/blockParser.js --cronProcessId 7
```

* Run Origin Finalizer
```bash
  source set_env_vars.sh
  node executables/blockScanner/finalizer.js --cronProcessId 9
```

### Funding crons
* Fund by master internal funder origin chain specific
```bash
  source set_env_vars.sh
  node executables/funding/byMasterInternalFunder/originChainSpecific.js --cronProcessId 10
```
