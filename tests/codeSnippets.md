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