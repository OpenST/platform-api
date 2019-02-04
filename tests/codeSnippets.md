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


```

### Check and transfer ETH & STPrime.

```js
chainOwner = '0xb45d7ec6199c347374332c60fe3a2f20c6d7da91';
facilitator = '0x74ecff0a31e9a5630587fecab413395ec7359f3a';
owner = '0xdb1e53cc6b8e0fd3971741da0c6c6e081178969a';

/// Fund OST Prime for economy setup: ByChainOwner
auxDeployer = '0x9266f942c4674b9471b8eb903478eb325056dd30';
auxAdmin = '0x48803484991537a70aa376b4239029cd7787a37b';
////Fund Eth for economy setup: ByChainOwner
originDeployer = '0x70e339ffeb9cef3e19fae77e87ac23ee8876820b';

auxChainId = 2000;
originChainId = 1000;

a = require('./lib/getBalance/Eth')
b = new a({originChainId: originChainId, addresses: [chainOwner, originDeployer, facilitator]})
b.perform().then(console.log)

a = require('./lib/getBalance/StPrime')
b = new a({auxChainId: auxChainId, addresses: [chainOwner, facilitator, auxAdmin]})
b.perform().then(console.log)

a = require('./lib/transfer/Eth')
b = new a({originChainId: originChainId, transferDetails: [{from: chainOwner,to: originDeployer, amountInWei:'2000000000000000000'}]})
b.perform().then(console.log)

a = require('./lib/transfer/StPrime')
b = new a({auxChainId: auxChainId, transferDetails: [{from: chainOwner,to: '0x9266f942c4674b9471b8eb903478eb325056dd30', amountInWei:'1999999977900000000'},
{from: c,to:'0x48803484991537a70aa376b4239029cd7787a37b', amountInWei:'1999999977900000000'}]})
b.perform().then(console.log)


response = null
chainConfigProvider = require('./lib/providers/chainConfig')
chainConfigProvider.getFor([2000]).then(function(resp){response = resp})
auxChainConfig = response[2000]
auxWsProviders = auxChainConfig.auxGeth.readOnly.wsProviders



rootPrefix = '.'
KnownAddressModel = require(rootPrefix + '/app/models/mysql/KnownAddress')
managedAddresses = null
new KnownAddressModel().getByAddressesSecure(['0xb12e2ab242cb324f61db62a026d1f628bbe2907e']).then(function(resp){managedAddresses = resp})
managedAddress = managedAddresses[0]

```