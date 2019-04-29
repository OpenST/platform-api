### Fetch Chain Config Strategy:

```node

let config = null;
rootPrefix = '.'
coreConstants = require(rootPrefix + '/config/coreConstants')
chainId = 2000;
a = require('./helpers/configStrategy/ByChainId.js')
b = new a(chainId);
b.getComplete().then(function(r) {config = r.data});

```

### Create IC:

```node

OSTBase = require('@ostdotcom/base')
InstanceComposer = OSTBase.InstanceComposer
ic = new InstanceComposer(config)

```
### Associate Worker
```js

require('./app/services/user/Create');
CreateUser = ic.getShadowedClassFor(coreConstants.icNameSpace, 'CreateUser');
asso = new CreateUser({client_id:1, token_id: 1, kind: 'user'});
asso.perform().then(console.log);

require('./app/services/device/Create');
CreateDevice = ic.getShadowedClassFor(coreConstants.icNameSpace, 'CreateDevice');
asso = new CreateDevice({client_id:1, user_id: '61e7a797-f7e4-4760-bd6d-2516b6b1e7ff', address: '0x734D3f5E8E51C40dD5e166FdA7b8329655d49eF6', api_signer_address: '0x27888C1b03E9D00aF3CbbE470442f8221e1E940c'});
asso.perform().then(console.log);

require('./app/services/user/CreateTokenHolder');
CreateTokenHolder = ic.getShadowedClassFor(coreConstants.icNameSpace, 'CreateTokenHolder');
asso = new CreateTokenHolder({client_id:1, user_id: '61e7a797-f7e4-4760-bd6d-2516b6b1e7ff', device_address: '0x734D3f5E8E51C40dD5e166FdA7b8329655d49eF6', recovery_owner_address: '0x734D3f5E8E51C40dD5e166FdA7b8329655d49eF6', session_addresses: ['0x595e45045c31438b95f9e38965d88de8f8879676'], expiration_height: '100000000', spending_limit: '10000000000000000000000'});
asso.perform().then(console.log);

a = require('./lib/executeTransactionManagement/FundExTxWorker.js')
b = new a({tokenId: 1001, chainId: 2000, exTxWorkerAddresses: ['0xb953bf26c311cf1f6d07091f5db26558140176e7']})
b.perform().then(console.log)


ForSession = require('./lib/nonce/get/ForSession');
asso = new ForSession({tokenId: '1063', chainId:200, address: '0x2db56678b1f95272e55650bddbcf1ee32ab2b027', userId: '053bbb8a-534a-44ef-8af1-cec9084be8f9'});
asso.getNonce().then(console.log);

require('./lib/nonce/contract/TokenHolder.js');
CreateUser = ic.getShadowedClassFor(coreConstants.icNameSpace, 'TokenHolderNonce');
asso = new CreateUser({auxChainId: 199, sessionAddress:'0x521e1488888d026c982ef0b871cbb8bbc0cba760', tokenId: 1063, userId: '0209c1a0-e4e7-446c-a1cd-df9acd0e45a3'});
asso.perform().then(console.log);

require('./lib/setup/economy/VerifySetup');
EconomySetupVerifier = ic.getShadowedClassFor(coreConstants.icNameSpace, 'EconomySetupVerifier');
asso = new EconomySetupVerifier({originChainId: 3, auxChainId: 2000, tokenId: 1003, stakeCurrencyContractAddress: '0xdbb1543f2677967eb1a63ebe4ea15b5c4f971a6c'});
asso.perform().then(console.log).catch(console.log);


params = {
  client_id: 10002,
  token_id: 1002,
  meta_property: {
      "name":  "company_to_user" , //like, download
      "type":  "company_to_user", // user_to_user, company_to_user, user_to_company
      "details" : "company_to_user"
  },
  to: "0x390877f70ce715913f5601f0b022a179af0bc662",
  raw_calldata: {
      method: 'directTransfer',
      parameters: [
          ['0x1bc25adfbafd92e76857ca3b74fb387c66b25e4c'],
          ['10']
      ]
  }
}

require('./app/services/transaction/execute/FromCompany');

ExecuteCompanyToUserTx = ic.getShadowedClassFor(coreConstants.icNameSpace,'ExecuteCompanyToUserTx');

submitTx = new ExecuteCompanyToUserTx(params);

submitTx.perform().then(console.log).catch(console.log)


require('./lib/cacheManagement/chainMulti/TokenUserDetail.js')
TokenUserDetailsCache = ic.getShadowedClassFor(coreConstants.icNameSpace,'TokenUserDetailsCache');
submitTx = new TokenUserDetailsCache({
  tokenId: '1',
  userIds: ['61e7a797-f7e4-4760-bd6d-2516b6b1e7ff']
});
submitTx.fetch().then(console.log).catch(console.log)


// From User Tx

user_data = {
  userId: '32e1ef20-5c9f-4336-a80f-bee4c330e13b',
    status: 'ACTIVATED',
    multisigAddress: '0x2e4f07ddca608b0369efa5325fdd3ebd08f64c13',
    updatedTimestamp: '1551346703',
    tokenHolderAddress: '0x5c9ff8ca5b2a5dd063b7804c34ec23f226f23a8d',
    deviceShardNumber: '1',
    kind: 'user',
    tokenId: '1001',
    recoveryOwnerAddress: '0x27888C1b03E9D00aF3CbbE470442f8221e1E940c',
    sessionShardNumber: '1',
    recoveryAddressShardNumber: 0,
    saasApiStatus: 'active'
}

params = {
  user_data: user_data,
  nonce: 3,
  signature: '0x3130c04bfef72b821ef2bfa53f7a39a7b90b37e47cab4d95c44d3981566770771520418704d221f4ad9e2703582e4006d59e79002f202bfc55b7f0aec1fccbf61b',
  signer: '0x481D1b527188968E5A4FF9fc112A9163384CCb03',
  client_id: 10001,
  token_id: 1001,
  meta_property: {
      "name":  "user_to_company" , //like, download
      "type":  "company_to_user", // user_to_user, company_to_user, user_to_company
      "details" : "company_to_user"
  },
  to: "0x4ddef38f71699c1680a5df47be783613dc0a46db",
  raw_calldata: JSON.stringify({
      method: 'directTransfers',
      parameters: [
          ['0x39c5f8de38f5915d07ef2e74eb28a81ef053f1d3'],
          ['100']
      ]
  })
}

require('./app/services/transaction/execute/FromUser.js');
ExecuteTxFromUser = ic.getShadowedClassFor(coreConstants.icNameSpace,'ExecuteTxFromUser');
submitTx = new ExecuteTxFromUser(params);
submitTx.perform().then(console.log).catch(console.log)


// Fetch user balance

require('./app/models/ddb/sharded/Balance.js');
BalanceModel = ic.getShadowedClassFor(coreConstants.icNameSpace, 'BalanceModel');
asso = new BalanceModel({shardNumber:1, chainId: 2000});
asso.updateBalance({
  blockChainSettledBalance: '0', // should be in respective BT Weis.
  erc20Address: '0x73a59fd69dbf0d9451dd57e894ce71ec718d258d',
  tokenHolderAddress: '0x39c5f8de38f5915d07ef2e74eb28a81ef053f1d3'
}).then(console.log);


require('./lib/executeTransactionManagement/AssociateWorker');
AssociateWorker = ic.getShadowedClassFor(coreConstants.icNameSpace, 'AssociateWorker');
asso = new AssociateWorker({tokenId:1009, cronProcessIds: [21]});
asso.perform().then(console.log);

```

###De-associate worker.
```js
require('./lib/executeTransactionManagement/DeAssociateWorker');
DeAssociateWorker = ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeAssociateWorker');
d = new DeAssociateWorker({tokenId:1009, cronProcessIds: [19]});
d.perform().then(console.log);
```

### Fetch Client Config Strategy:

```node

let config = null;
rootPrefix = '.'
coreConstants = require(rootPrefix + '/config/coreConstants')
clientId = 4;
a = require('./helpers/configStrategy/ByClientId.js')
b = new a(clientId);
b.get().then(function(r) {config = r.data});

```

### Run Economy Setup Validator

```node

let config = null;
rootPrefix = '.'
coreConstants = require(rootPrefix + '/config/coreConstants')
clientId = 4;
a = require('./helpers/configStrategy/ByClientId.js')
b = new a(clientId);
b.get().then(function(r) {config = r.data});

// wait


OSTBase = require('@ostdotcom/base')
InstanceComposer = OSTBase.InstanceComposer
ic = new InstanceComposer(config)

require(rootPrefix + '/lib/setup/economy/VerifySetup.js')

EconomySetupVerifier = ic.getShadowedClassFor(coreConstants.icNameSpace,'EconomySetupVerifier');

a = new EconomySetupVerifier({tokenId: 1004, originChainId: 3, auxChainId: 2000})

a.perform().then(console.log)


```


### Manually retry a workflow step:

```sh
node helpers/retryWorkflowStep.js <workflowStepId>
```

```node

params = {
  currentStepId: 46,
  workflowId: 3,
  stepKind: 'deployTokenGateway',
  taskStatus: 'taskReadyToStart',
  requestParams: {},
  topic: 'workflow.economySetup'
}
economySetupRouterK = require('./lib/workflow/economySetup/Router.js')
economySetupRouter = new economySetupRouterK(params)
economySetupRouter.perform().then(console.log).catch(function(err){console.log('--------------err--', err)})


abiDecoder = require('abi-decoder')
testABI = [{"constant":true,"inputs":[],"name":"organization","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"coAnchor","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[{"name":"_remoteChainId","type":"uint256"},{"name":"_blockHeight","type":"uint256"},{"name":"_stateRoot","type":"bytes32"},{"name":"_maxStateRoots","type":"uint256"},{"name":"_organization","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"_blockHeight","type":"uint256"},{"indexed":false,"name":"_stateRoot","type":"bytes32"}],"name":"StateRootAvailable","type":"event"},{"constant":false,"inputs":[{"name":"_coAnchor","type":"address"}],"name":"setCoAnchorAddress","outputs":[{"name":"success_","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"_blockHeight","type":"uint256"}],"name":"getStateRoot","outputs":[{"name":"stateRoot_","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"getLatestStateRootBlockHeight","outputs":[{"name":"height_","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_blockHeight","type":"uint256"},{"name":"_stateRoot","type":"bytes32"}],"name":"anchorStateRoot","outputs":[{"name":"success_","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"getRemoteChainId","outputs":[{"name":"remoteChainId_","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"}]
abiDecoder.addABI(testABI);

testData = "0x5cf12c78000000000000000000000000000000000000000000000000000000000000003ee696e5400a7d294c1e309b39217fb605c6cdcaa3c520bc498e679bfb93b58d26"
decodedData = abiDecoder.decodeMethod(testData)

```

### Check and transfer ETH & STPrime.

```js
chainOwner = '0xc75d1d02fcab92625f92bc573600753075695b96';
facilitator = '0x74ecff0a31e9a5630587fecab413395ec7359f3a';
owner = '0xdb1e53cc6b8e0fd3971741da0c6c6e081178969a';

/// Fund OST Prime for economy setup: ByChainOwner
auxDeployer = '0x9266f942c4674b9471b8eb903478eb325056dd30';
auxAdmin = '0x48803484991537a70aa376b4239029cd7787a37b';
////Fund Eth for economy setup: ByChainOwner
originDeployer = '0x70e339ffeb9cef3e19fae77e87ac23ee8876820b';

auxChainId = 2000;
originChainId = 3;

a = require('./lib/getBalance/Eth');
b = new a({originChainId: originChainId, addresses: [chainOwner, originDeployer, facilitator]});
b.perform().then(console.log);

a = require('./lib/getBalance/Erc20');
b = new a({originChainId: 3, addresses: ['0x51f79cc09a4d3464e52a686292c6e9e371095b4b'], contractAddress: '0x7Be6406a84Fa6c6D9f9c2B15616096B7712E9DA1'});
b.perform().then(console.log);

a = require('./lib/getBalance/StPrime');
b = new a({auxChainId: 2000, addresses: ['0x9b8497f476ca8c285f69c911f2fc6fb727d5c9c9']});
b.perform().then(console.log);

a = require('./lib/getBalance/Ubt');
b = new a({auxChainId: 1407, tokenId: 1003, addresses: ['0x8bfca77079bbb3da3fb4293c64de3b9010c3948b']});
b.perform().then(console.log);

a = require('./lib/transfer/Eth');
b = new a({originChainId: originChainId, transferDetails: [{from: chainOwner,to: originDeployer, amountInWei:'2000000000000000000'}]});
b.perform().then(console.log);

chainOwner = '0x736ffae5b3f2375c5b3fccb3bb76341a565cb217';
auxChainId = 2000;
a = require('./lib/fund/stPrime/BatchTransfer')
b = new a({auxChainId: auxChainId, transferDetails: [{fromAddress: chainOwner,toAddress: '0x9b8497f476ca8c285f69c911f2fc6fb727d5c9c9', amountInWei:'50000000000000000000'}]})
b.perform().then(console.log)


response = null;
chainConfigProvider = require('./lib/providers/chainConfig');
chainConfigProvider.getFor([2000]).then(function(resp){response = resp});
auxChainConfig = response[2000];
auxWsProviders = auxChainConfig.auxGeth.readOnly.wsProviders;


rootPrefix = '.';
KnownAddressModel = require(rootPrefix + '/app/models/mysql/KnownAddress');
managedAddresses = null;
new KnownAddressModel().getByAddressesSecure(['0xb12e2ab242cb324f61db62a026d1f628bbe2907e']).then(function(resp){managedAddresses = resp});
managedAddress = managedAddresses[0];

```

### BT Redeem and Unstake.
```bash
    source set_env_vars.sh
    > node
        OSTBase = require('@ostdotcom/base')
        InstanceComposer = OSTBase.InstanceComposer
        ic = new InstanceComposer(config)
        
        require('./app/services/token/redeem/ByCompany.js')
        
        TokenRedeemByCompany = ic.getShadowedClassFor(coreConstants.icNameSpace,'TokenRedeemByCompany');
        
        a = new TokenRedeemByCompany({token_id: 1009, client_id: 10009, 
            beneficiary: '0x5f2EA87f3515C608f6d7255082A07Ff7B61d59f1', 
            amount_to_redeem: '100000000000000000000'})
        
        a.perform().then(console.log)
```

### ST Prime Redeem and Unstake.
```bash
    source set_env_vars.sh
    > node
        params = {
            stepKind: 'stPrimeRedeemAndUnstakeInit',
            taskStatus: 'taskReadyToStart',
            clientId: 0,
            chainId: 2000,
            topic: 'workflow.stPrimeRedeemAndUnstake',
            requestParams: {
                redeemerAddress: '0x64b4f5e4de24522fc5cd05883d4c858379ee78f6', 
                originChainId: 1000, 
                auxChainId: 2000, 
                sourceChainId: 2000,
                destinationChainId: 1000,
                facilitator: '0x64b4f5e4de24522fc5cd05883d4c858379ee78f6', 
                amountToRedeem: '100000000000000000000', 
                beneficiary: '0x64b4f5e4de24522fc5cd05883d4c858379ee78f6'
            }
    }
    stPrimeRouterK = require('./lib/workflow/redeemAndUnstake/stPrime/Router')
    stPrimeRouter = new stPrimeRouterK(params)

    stPrimeRouter.perform().then(console.log).catch(function(err){console.log('err', err)})
```