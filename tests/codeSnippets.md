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

require('./lib/executeTransactionManagement/AssociateWorker');
AssociateWorker = ic.getShadowedClassFor(coreConstants.icNameSpace, 'AssociateWorker');
asso = new AssociateWorker({tokenId:1012, cronProcessIds: [16]});
asso.perform().then(console.log);

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
  currentStepId: 631,
  workflowId: 35,
  stepKind: 'setInternalActorForOwnerInUBT',
  taskStatus: 'taskReadyToStart',
  requestParams: {},
  topic: 'workflow.economySetup'
}
economySetupRouterK = require('./executables/workflowRouter/EconomySetupRouter')
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

a = require('./lib/getBalance/StPrime');
b = new a({auxChainId: auxChainId, addresses: [chainOwner, facilitator, auxAdmin]});
b.perform().then(console.log);

a = require('./lib/transfer/Eth');
b = new a({originChainId: originChainId, transferDetails: [{from: chainOwner,to: originDeployer, amountInWei:'2000000000000000000'}]});
b.perform().then(console.log);

chainOwner = '0xc75d1d02fcab92625f92bc573600753075695b96';
auxChainId = 2000;
a = require('./lib/fund/stPrime/BatchTransfer')
b = new a({auxChainId: auxChainId, transferDetails: [{fromAddress: chainOwner,toAddress: '0xcdc463aa7b937fe477f59d9421658dc7ebb097ea', amountInWei:'989999600000000000000'}]})
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