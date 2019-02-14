# AUX CHAIN SETUP

## Seed config strategy

* AUX Configs Seed
```bash
    ./devops/exec/configStrategy.js --add-aux-configs

    # Note: For staging and production follow help
```

* Activate AUX Configs
```bash
    ./devops/exec/configStrategy.js --activate-configs --chain-id 2000 --group-id 1
```

## Setup AUX Block Scanner and SAAS DDB

* Create all SAAS Owned DDB Tables
```bash
    source set_env_vars.sh
    node executables/setup/aux/saasDdb.js --auxChainId 2000 --userShardNoStr 1,2 --deviceShardNoStr 1,2 --sessionShardNoStr 1,2
```
    * Mandatory parameters: auxChainId
    * Optional parameters (defaults to 1): userShardCount, deviceShardCount, sessionShardCount

* Create Aux DDB Tables (Run the addChain service and pass all the necessary parameters):
```bash
    source set_env_vars.sh
    node executables/setup/blockScanner/initialSetup.js --chainId 2000
    node executables/setup/blockScanner/addChain.js --chainId 2000 --networkId 2000 --blockShardCount 1 --transactionShardCount 1 --economyShardCount 2 --economyAddressShardCount 2
```
    * Mandatory parameters: chainId, networkId
    * Optional parameters (defaults to 1): blockShardCount, economyShardCount, economyAddressShardCount, transactionShardCount


## Auxiliary Chain Setup

* Generate AUX addresses and Fund.
```bash
  source set_env_vars.sh
  node devops/exec/chainSetup.js --generate-aux-addresses --chain-id 2000
```

* [Only Development] Setup Aux GETH and necessary addresses.
```bash
  source set_env_vars.sh
  node tools/localSetup/aux/setupGeth.js --originChainId 1000 --auxChainId 2000
```

* [Only Development] Start AUX GETH (with Zero Gas Price) with this script.
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

* Seed the cron processes which are associated to the aux chain using this script.
```bash
   node tools/localSetup/auxChainSpecificCronSeeder.js
```
   
## Run block-scanner crons

* Start Aux Workflow router factory
```bash
  source set_env_vars.sh
  node executables/auxWorkflowRouter/factory.js --cronProcessId 20
```

* Run Auxiliary Transaction Parser
```bash
  source set_env_vars.sh
  node executables/blockScanner/TransactionParser.js --cronProcessId 9
```

* Run Auxiliary Block Parser
```bash
  source set_env_vars.sh
  node executables/blockScanner/BlockParser.js --cronProcessId 8
```

* Run Auxiliary Finalizer
```bash
  source set_env_vars.sh
  node executables/blockScanner/Finalizer.js --cronProcessId 10
```

## ST Prime Stake and Mint in Zero Gas

//TODO: change amountToStake to amountToStakeInWei
```bash
    source set_env_vars.sh
    export SA_DEFAULT_AUX_GAS_PRICE='0x0'
    node

        beneficiary -> masterInternalFunderKind
        facilitator -> masterInternalFunderKind
        stakerAddress -> masterInternalFunderKind
  
        params = {
                stepKind: 'stPrimeStakeAndMintInit',
                taskStatus: 'taskReadyToStart',
                clientId: 0,
                chainId: 1000,
                topic: 'workflow.stPrimeStakeAndMint',
                requestParams: {
                    stakerAddress: '0xaf744125930c0ffa3f343761e187c0e222dbf048', 
                    originChainId: 1000, 
                    auxChainId: 2000, 
                    facilitator: '0xaf744125930c0ffa3f343761e187c0e222dbf048', 
                    amountToStake: '100000000000000000001', 
                    beneficiary: '0xaf744125930c0ffa3f343761e187c0e222dbf048'
                  }
            }
        stPrimeRouterK = require('./executables/workflowRouter/stakeAndMint/StPrimeRouter')
        stPrimeRouter = new stPrimeRouterK(params)
   
        stPrimeRouter.perform().then(console.log).catch(function(err){console.log('err', err)})
```
* [HELP ONLY TO KNOW HOW TO START THE STUCK WORKFLOW]
```js
        params = {
              stepKind: '', //step kind of row from where it need to restart
              taskStatus: 'taskReadyToStart',
              clientId: 0,
              chainId: 1000,
              topic: 'workflow.stPrimeStakeAndMint',
              workflowId: , //Workflow id
              currentStepId: //Id of table from where it need to restart
          }
```

* Stop geth running at zero gas price & Start AUX GETH (With Non Zero Gas Price) with this script.
```bash
    sh ~/openst-setup/bin/aux-2000/aux-chain-2000.sh
```

* Reset the SA_DEFAULT_AUX_GAS_PRICE env var to non zero value.
```bash
    source set_env_vars.sh
```

* Update price points.
```bash
   source set_env_vars.sh
   node executables/UpdatePricePoints.js --cronProcessId 15
```

## Run Aggregator
```bash
  source set_env_vars.sh
  node executables/blockScanner/Aggregator.js --cronProcessId 11
```

### Funding crons

* Fund by sealer aux chain specific
```bash
  source set_env_vars.sh
  node executables/funding/bySealer/auxChainSpecific.js --cronProcessId 13
```

* Fund by master internal funder aux chain specific chain addresses
```bash
  source set_env_vars.sh
  node executables/funding/byMasterInternalFunder/auxChainSpecific/chainAddresses.js --cronProcessId 12
```

* Fund by master internal funder aux chain specific token funder addresses
```bash
  source set_env_vars.sh
  node executables/funding/byMasterInternalFunder/auxChainSpecific/tokenFunderAddresses.js --cronProcessId 16
```

* Fund by master internal funder aux chain specific inter chain facilitator addresses on origin chain.
```bash
  source set_env_vars.sh
  node executables/funding/byMasterInternalFunder/auxChainSpecific/interChainFacilitatorAddresses.js --cronProcessId 17
```

* Fund by token aux funder aux chain specific
```bash
  source set_env_vars.sh
  node executables/funding/byTokenAuxFunder/auxChainSpecific.js --cronProcessId 14
```

###### ALWAYS AT THE END
### Open up config group for allocation
```js
let ConfigGroupModel = require('./app/models/mysql/ConfigGroup');
let auxChainId = 2000;
let auxGroupId = 1;

ConfigGroupModel.markAsAvailableForAllocation(auxChainId, auxGroupId).then(console.log);
```
