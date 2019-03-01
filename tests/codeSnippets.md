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

OSTBase = require('@openstfoundation/openst-base')
InstanceComposer = OSTBase.InstanceComposer
ic = new InstanceComposer(config)

```
### Associate Worker
```js

require('./app/services/user/Create');
CreateUser = ic.getShadowedClassFor(coreConstants.icNameSpace, 'CreateUser');
asso = new CreateUser({client_id:10087, token_id: 1063, kind: 'user'});
asso.perform().then(console.log);

require('./app/services/device/Create');
CreateDevice = ic.getShadowedClassFor(coreConstants.icNameSpace, 'CreateDevice');
asso = new CreateDevice({client_id:10087, user_id: '053bbb8a-534a-44ef-8af1-cec9084be8f9', address: '0x734D3f5E8E51C40dD5e166FdA7b8329655d49eF6', api_signer_address: '0x27888C1b03E9D00aF3CbbE470442f8221e1E940c', device_name: 'sdsdsds', device_uuid: 'dsdsdsds'});
asso.perform().then(console.log);

require('./app/services/user/CreateTokenHolder');
CreateTokenHolder = ic.getShadowedClassFor(coreConstants.icNameSpace, 'CreateTokenHolder');
asso = new CreateTokenHolder({client_id:10087, user_id: '053bbb8a-534a-44ef-8af1-cec9084be8f9', device_address: '0x734d3f5e8e51c40dd5e166fda7b8329655d49ef6', recovery_owner_address: '0x27888C1b03E9D00aF3CbbE470442f8221e1E940c', session_addresses: ['0x2dB56678B1F95272E55650BDdbCf1eE32aB2B027'], expiration_height: '100000000', spending_limit: '10000000000000000000000'});
asso.perform().then(console.log);

a = require('./lib/executeTransactionManagement/FundExTxWorker.js')
b = new a({tokenId: 1063, chainId: 200, exTxWorkerAddresses: ['0x207f44087ccd5bdecdf8606c4ca3a2ffec74fe87']})
b.perform().then(console.log)


ForSession = require('./lib/nonce/get/ForSession');
asso = new ForSession({tokenId: '1063', chainId:200, address: '0x2db56678b1f95272e55650bddbcf1ee32ab2b027', userId: '053bbb8a-534a-44ef-8af1-cec9084be8f9'});
asso.getNonce().then(console.log);



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
  tokenId: '1063',
  userIds: ['053bbb8a-534a-44ef-8af1-cec9084be8f9']
});
submitTx.fetch().then(console.log).catch(console.log)


require('./app/models/ddb/sharded/Balance.js');
BalanceModel = ic.getShadowedClassFor(coreConstants.icNameSpace, 'BalanceModel');
asso = new BalanceModel({shardNumber:2, chainId: 200});
asso.updateBalance({
  blockChainSettledBalance: '500000000000000000000',
  erc20Address: '0xb00b57df128e9afbc6a2487544d1e847bf7d2039',
  tokenHolderAddress: '0xd97f2ca4dff7b8e129d1e7d72ec1cf9ff9c0ae00'
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


OSTBase = require('@openstfoundation/openst-base')
InstanceComposer = OSTBase.InstanceComposer
ic = new InstanceComposer(config)

require(rootPrefix + '/lib/setup/economy/VerifySetup.js')

EconomySetupVerifier = ic.getShadowedClassFor(coreConstants.icNameSpace,'EconomySetupVerifier');

a = new EconomySetupVerifier({tokenId: 1004, originChainId: 1000, auxChainId: 2000})

a.perform().then(console.log)


```


### Manually retry a workflow step:

```node

params = {
  currentStepId: 82,
  workflowId: 2,
  stepKind: 'initializeCompanyTokenHolderInDb',
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
originChainId = 1000;

a = require('./lib/getBalance/Eth');
b = new a({originChainId: originChainId, addresses: [chainOwner, originDeployer, facilitator]});
b.perform().then(console.log);

a = require('./lib/getBalance/Ost');
b = new a({originChainId: originChainId, addresses: ['0x75c16730392e04218a5d14cdd405267c4d88973a']});
b.perform().then(console.log);

a = require('./lib/getBalance/StPrime');
b = new a({auxChainId: auxChainId, addresses: [chainOwner, facilitator, auxAdmin]});
b.perform().then(console.log);

a = require('./lib/transfer/Eth');
b = new a({originChainId: originChainId, transferDetails: [{from: chainOwner,to: originDeployer, amountInWei:'2000000000000000000'}]});
b.perform().then(console.log);

chainOwner = '0xdb3b6e4c9ce358b0ed2586bf36d2f3a0c21678b6';
auxChainId = 2000;
a = require('./lib/fund/stPrime/BatchTransfer')
b = new a({auxChainId: auxChainId, transferDetails: [{fromAddress: chainOwner,toAddress: '0x1d6927f6dc4f5184e55a79bcb1fac663adb9f021', amountInWei:'10000000000000000000'}]})
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
