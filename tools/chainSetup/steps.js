// 1. ORIGIN -> generate known addresses (for these private keys are stored in db)
//
// a. Deployer
// b. STPrimeOwner
// c. STPrimeAdmin
// d. Worker

// TODO - chain id is hardcoded. please remove.
async function generateOriginAddresses() {
  let rootPrefix = '.',
    chainId = '1000';

  let Klass = require(rootPrefix + '/tools/helpers/GenerateChainKnownAddresses.js');
  let chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');
  let obj = new Klass({
    addressKinds: [
      chainAddressConstants.deployerKind,
      chainAddressConstants.ownerKind,
      chainAddressConstants.adminKind,
      chainAddressConstants.workerKind
    ],
    chainKind: 'origin',
    chainId: chainId
  });

  let generateRsp = await obj.perform();

  console.log('rsp', generateRsp.toHash());

  return generateRsp;
}

generateOriginAddresses();

// 2. ORIGIN -> Fund deployer & owner addresses
// geth attach http://127.0.0.1:8545
// deployer = '0xB0ccC0D9Dba9697633889aA59561C657887146b0'
// owner = '0x1f94cBdf28f825D2f679d1DE065c7AA8A5B96b9d'
// eth.sendTransaction({from:eth.coinbase, to:deployer, value: web3.toWei(2, "ether")})
// eth.sendTransaction({from:eth.coinbase, to:owner, value: web3.toWei(2, "ether")})
// Check balance
// eth.getBalance(deployer)
// eth.getBalance(owner)

// 3. ORIGIN -> (START: For Non Production Main Env ONLY)
//

///////////  a. generate SimpleTokenOwner & SimpleTokenAdmin private keys

function generatePrivateKey() {
  let Klass = require('./tools/helpers/GeneratePrivateKey.js');
  let obj = new Klass();
  let rsp = obj.perform();
  return rsp;
}

generatePrivateKey();
generatePrivateKey();

let simpleTokenOwnerAddr = '0xB368987E5aF24f8B0FfB10E8bE8cd204E13427b0';
let simpleTokenOwnerPrivateKey = '0x4612ec3c2d59732a1949f003b3d3eb0b5922cac625c82e17e5522c3a02d690d3';

let simpleTokenAdminAddr = '0x33A8Ad5aED5eF619033b84916E99b856F33b1005';
let simpleTokenAdminPrivateKey = '0xe5cd83683b0637adbe6ea5bca5583ad07a42745308dc50ba82312b6729d823ae';

///////////  b. Fund SimpleTokenOwner & SimpleTokenAdmin with ETH on origin chain

// eth.sendTransaction({from:eth.coinbase, to:simpleTokenOwnerAddr, value: web3.toWei(2, "ether")})
// eth.sendTransaction({from:eth.coinbase, to:simpleTokenAdminAddr, value: web3.toWei(2, "ether")})
// Check balance
// eth.getBalance(simpleTokenOwnerAddr)
// eth.getBalance(simpleTokenAdminAddr)

///////////  c. Deploy Simple Token
async function deploySimpleToken(signerAddress, signerKey) {
  let rootPrefix = '.';

  let ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId');
  let configStrategyHelper = new ConfigStrategyHelper(0, 0);

  let configRsp = await configStrategyHelper.getComplete();

  let OSTBase = require('@openstfoundation/openst-base');
  let InstanceComposer = OSTBase.InstanceComposer;
  let coreConstants = require(rootPrefix + '/config/coreConstants');

  require(rootPrefix + '/tools/chainSetup/origin/simpleToken/Deploy.js');

  let ic = new InstanceComposer(configRsp.data);

  let Klass = ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeploySimpleToken');

  let obj = new Klass({
    signerAddress: signerAddress,
    signerKey: signerKey
  });

  return await obj.perform();
}

deploySimpleToken(simpleTokenOwnerAddr, simpleTokenOwnerPrivateKey);

/////////// d. Set Simple Token Admin

async function setSimpleTokenAdmin(signerAddress, signerKey, adminAddress) {
  let rootPrefix = '.';

  let ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId');
  let configStrategyHelper = new ConfigStrategyHelper(0, 0);

  let configRsp = await configStrategyHelper.getComplete();

  let OSTBase = require('@openstfoundation/openst-base');
  let InstanceComposer = OSTBase.InstanceComposer;
  let coreConstants = require(rootPrefix + '/config/coreConstants');

  require(rootPrefix + '/tools/chainSetup/origin/simpleToken/SetAdminAddress');

  let ic = new InstanceComposer(configRsp.data);

  let Klass = ic.getShadowedClassFor(coreConstants.icNameSpace, 'SetSimpleTokenAdmin');

  let obj = new Klass({
    signerAddress: signerAddress,
    signerKey: signerKey,
    adminAddress: adminAddress
  });

  return await obj.perform();
}

setSimpleTokenAdmin(simpleTokenOwnerAddr, simpleTokenOwnerPrivateKey, simpleTokenAdminAddr);

///////////  e. finalize simple token address

async function finalizeSimpleTokenAdmin(signerAddress, signerKey) {
  let rootPrefix = '.';

  let ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId');
  let configStrategyHelper = new ConfigStrategyHelper(0, 0);

  let configRsp = await configStrategyHelper.getComplete();

  let OSTBase = require('@openstfoundation/openst-base');
  let InstanceComposer = OSTBase.InstanceComposer;
  let coreConstants = require(rootPrefix + '/config/coreConstants');

  require(rootPrefix + '/tools/chainSetup/origin/simpleToken/Finalize');

  let ic = new InstanceComposer(configRsp.data);

  let Klass = ic.getShadowedClassFor(coreConstants.icNameSpace, 'FinalizeSimpleToken');

  let obj = new Klass({
    signerAddress: signerAddress,
    signerKey: signerKey
  });

  return await obj.perform();
}

finalizeSimpleTokenAdmin(simpleTokenAdminAddr, simpleTokenAdminPrivateKey);

// ############################################ 3. (END: For Non Production Main Env ONLY)  #################

// 4. Database -> Insert in chain_addresses

////////// a. SimpleTokenOwner

async function insertSimpleTokenOwnerInDb(chainId, address) {
  let Klass = require('./app/models/mysql/ChainAddress.js');
  let rootPrefix = '.';
  let chainAddressConst = require(rootPrefix + '/lib/globalConstant/chainAddress');
  let obj = new Klass();
  let rsp = await obj.insertAddress({
    address: address,
    chainId: chainId,
    chainKind: chainAddressConst.originChainKind,
    kind: chainAddressConst.simpleTokenOwnerKind
  });
  return rsp;
}

let originChainId = '1000';
insertSimpleTokenOwnerInDb(originChainId, simpleTokenOwnerAddr);

/////////// b. SimpleTokenAdmin

async function insertSimpleTokenAdminInDb(chainId, address) {
  let rootPrefix = '.';

  let Klass = require('./app/models/mysql/ChainAddress.js');
  let chainAddressConst = require(rootPrefix + '/lib/globalConstant/chainAddress');
  let obj = new Klass();
  let rsp = await obj.insertAddress({
    address: address,
    chainId: chainId,
    kind: chainAddressConst.simpleTokenAdminKind,
    chainKind: chainAddressConst.originChainKind
  });
  return rsp;
}

insertSimpleTokenAdminInDb(originChainId, simpleTokenAdminAddr);

// 5. ORIGIN -> Setup organizations

async function setupOriginOrganization(addressKind) {
  let rootPrefix = '.',
    chainId = '1000';

  let chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig');
  let coreConstants = require(rootPrefix + '/config/coreConstants');
  let config = {};
  let rsp = await chainConfigProvider.getFor([chainId]);
  config = rsp[chainId];

  let OSTBase = require('@openstfoundation/openst-base');
  let InstanceComposer = OSTBase.InstanceComposer;

  let ic = new InstanceComposer(config);

  require(rootPrefix + '/tools/chainSetup/SetupOrganization');

  let SetupOrganization = ic.getShadowedClassFor(coreConstants.icNameSpace, 'SetupOrganization');

  let chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

  return await new SetupOrganization({
    chainKind: chainAddressConstants.originChainKind,
    addressKind: addressKind
  }).perform();
}

let chainAddressConstants = require('./lib/globalConstant/chainAddress');

/////////// a. For Simple Token Prime contract
setupOriginOrganization(chainAddressConstants.baseContractOrganizationKind)
  .then(console.log)
  .catch(console.log);

/////////// b. for anchor
setupOriginOrganization(chainAddressConstants.anchorOrganizationKind)
  .then(console.log)
  .catch(console.log);

// 6. ORIGIN -> Deploy Anchor contract

async function deployOriginAnchor() {
  let rootPrefix = '.',
    chainId = '1000';

  let chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig');
  let coreConstants = require(rootPrefix + '/config/coreConstants');
  let chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');
  let config = {};
  let rsp = await chainConfigProvider.getFor([chainId]);
  config = rsp[chainId];

  let OSTBase = require('@openstfoundation/openst-base');
  let InstanceComposer = OSTBase.InstanceComposer;

  let ic = new InstanceComposer(config);

  require(rootPrefix + '/tools/chainSetup/DeployAnchor');

  let DeployAnchor = ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeployAnchor');

  return await new DeployAnchor({ chainKind: chainAddressConstants.originChainKind }).perform();
}

deployOriginAnchor()
  .then(console.log)
  .catch(console.log);

// 7. AUX -> generate addresses on aux chain

//
// a. Deployer
// b. STPrimeOwner
// c. STPrimeAdmin
// d. ChainOwner
// e. Worker
//

async function generateAuxAddresses() {
  let rootPrefix = '.',
    chainId = '2000';

  let Klass = require(rootPrefix + '/tools/helpers/GenerateChainKnownAddresses.js');
  let chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');
  let obj = new Klass({
    addressKinds: [
      chainAddressConstants.deployerKind,
      chainAddressConstants.ownerKind,
      chainAddressConstants.adminKind,
      chainAddressConstants.chainOwnerKind,
      chainAddressConstants.workerKind
    ],
    chainKind: chainAddressConstants.auxChainKind,
    chainId: chainId
  });

  return await obj.perform();
}

generateAuxAddresses()
  .then(console.log)
  .catch(console.log);

// 8. AUX -> setup Organization

async function setupAuxOrganization(addressKind) {
  let rootPrefix = '.',
    chainId = '2000';

  let chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig');
  let coreConstants = require(rootPrefix + '/config/coreConstants');
  let config = {};
  let rsp = await chainConfigProvider.getFor([chainId]);
  config = rsp[chainId];

  let OSTBase = require('@openstfoundation/openst-base');
  let InstanceComposer = OSTBase.InstanceComposer;

  let ic = new InstanceComposer(config);

  require(rootPrefix + '/tools/chainSetup/SetupOrganization');

  let SetupOrganization = ic.getShadowedClassFor(coreConstants.icNameSpace, 'SetupOrganization');

  let chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

  return await new SetupOrganization({
    chainKind: chainAddressConstants.auxChainKind,
    addressKind: addressKind
  }).perform();
}

let chainAddressConstants = require('./lib/globalConstant/chainAddress');

/////////// a. for ST Prime
setupAuxOrganization(chainAddressConstants.baseContractOrganizationKind)
  .then(console.log)
  .catch(console.log);

/////////// b. for anchor
setupAuxOrganization(chainAddressConstants.anchorOrganizationKind)
  .then(console.log)
  .catch(console.log);

// 9. SetUp ST Prime

/////////// a. Deploy

async function deploySTPrime() {
  let rootPrefix = '.',
    chainId = '2000';

  let chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig');
  let coreConstants = require(rootPrefix + '/config/coreConstants');
  let config = {};
  let rsp = await chainConfigProvider.getFor([chainId]);
  config = rsp[chainId];

  let OSTBase = require('@openstfoundation/openst-base');
  let InstanceComposer = OSTBase.InstanceComposer;

  let ic = new InstanceComposer(config);

  require(rootPrefix + '/tools/chainSetup/aux/simpleTokenPrime/Deploy');

  let DeploySimpleTokenPrime = ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeploySimpleTokenPrime');

  return await new DeploySimpleTokenPrime({}).perform();
}

deploySTPrime()
  .then(console.log)
  .catch(console.log);

/////////// b. Transfer 800M to chain owner

/////////// c. Initialize

async function initializeSTPrime() {
  let rootPrefix = '.',
    chainId = '2000';

  let chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig');
  let coreConstants = require(rootPrefix + '/config/coreConstants');
  let config = {};
  let rsp = await chainConfigProvider.getFor([chainId]);
  config = rsp[chainId];

  let OSTBase = require('@openstfoundation/openst-base');
  let InstanceComposer = OSTBase.InstanceComposer;

  let ic = new InstanceComposer(config);

  require(rootPrefix + '/tools/chainSetup/aux/simpleTokenPrime/Initialize');

  let InitializeSimpleTokenPrime = ic.getShadowedClassFor(coreConstants.icNameSpace, 'InitializeSimpleTokenPrime');

  return await new InitializeSimpleTokenPrime({ chainId: chainId }).perform();
}

initializeSTPrime()
  .then(console.log)
  .catch(console.log);

// 10. AUX -> Deploy Anchor

async function deployAuxAnchor() {
  let rootPrefix = '.',
    chainId = '2000';

  let chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig');
  let coreConstants = require(rootPrefix + '/config/coreConstants');
  let chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');
  let config = {};
  let rsp = await chainConfigProvider.getFor([chainId]);
  config = rsp[chainId];

  let OSTBase = require('@openstfoundation/openst-base');
  let InstanceComposer = OSTBase.InstanceComposer;

  let ic = new InstanceComposer(config);

  require(rootPrefix + '/tools/chainSetup/DeployAnchor');

  let DeployAnchor = ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeployAnchor');

  return await new DeployAnchor({ chainKind: chainAddressConstants.auxChainKind }).perform();
}

deployAuxAnchor()
  .then(console.log)
  .catch(console.log);

async function setCoAnchor(chainKind) {
  let rootPrefix = '.',
    chainId = '2000';

  let chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig');
  let coreConstants = require(rootPrefix + '/config/coreConstants');
  let config = {};
  let rsp = await chainConfigProvider.getFor([chainId]);
  config = rsp[chainId];

  let OSTBase = require('@openstfoundation/openst-base');
  let InstanceComposer = OSTBase.InstanceComposer;

  let ic = new InstanceComposer(config);

  require(rootPrefix + '/tools/chainSetup/SetCoAnchor');

  let SetCoAnchor = ic.getShadowedClassFor(coreConstants.icNameSpace, 'SetCoAnchor');

  return await new SetCoAnchor({ chainKind: chainKind }).perform();
}

// 11. ORIGIN -> Set Co Anchor

setCoAnchor(chainAddressConstants.originChainKind)
  .then(console.log)
  .catch(console.log);

// 12. AUX -> Set Co Anchor

setCoAnchor(chainAddressConstants.auxChainKind)
  .then(console.log)
  .catch(console.log);

async function deployLib(chainKind, libKind) {
  let rootPrefix = '.',
    chainId = '2000';

  let chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig');
  let coreConstants = require(rootPrefix + '/config/coreConstants');
  let chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');
  let config = {};
  let rsp = await chainConfigProvider.getFor([chainId]);
  config = rsp[chainId];

  let OSTBase = require('@openstfoundation/openst-base');
  let InstanceComposer = OSTBase.InstanceComposer;

  let ic = new InstanceComposer(config);

  require(rootPrefix + '/tools/chainSetup/DeployLib');

  let DeployLib = ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeployLib');

  return await new DeployLib({
    chainKind: chainKind,
    libKind: libKind
  }).perform();
}

// 13. ORIGIN -> Deploy Libs

/////////// a. Deploy merklePatriciaProof lib

deployLib(chainAddressConstants.originChainKind, 'merklePatriciaProof')
  .then(console.log)
  .catch(console.log);

/////////// b. Deploy messageBus lib
deployLib(chainAddressConstants.originChainKind, 'messageBus')
  .then(console.log)
  .catch(console.log);

/////////// c. Deploy gateway lib
deployLib(chainAddressConstants.originChainKind, 'gateway')
  .then(console.log)
  .catch(console.log);

// 14. AUX -> Deploy Libs

/////////// a. Deploy merklePatriciaProof lib

deployLib(chainAddressConstants.auxChainKind, 'merklePatriciaProof')
  .then(console.log)
  .catch(console.log);

/////////// b. Deploy messageBus lib
deployLib(chainAddressConstants.auxChainKind, 'messageBus')
  .then(console.log)
  .catch(console.log);

/////////// c. Deploy gateway lib
deployLib(chainAddressConstants.auxChainKind, 'gateway')
  .then(console.log)
  .catch(console.log);

// 15. ORIGIN -> Deploy Gateway Contract

async function deployGatewayContract() {
  let rootPrefix = '.',
    chainId = '1000';

  let chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig');
  let coreConstants = require(rootPrefix + '/config/coreConstants');
  let config = {};
  let rsp = await chainConfigProvider.getFor([chainId]);
  config = rsp[chainId];

  let OSTBase = require('@openstfoundation/openst-base');
  let InstanceComposer = OSTBase.InstanceComposer;

  let ic = new InstanceComposer(config);

  require(rootPrefix + '/tools/chainSetup/origin/DeployGateway');

  let DeployGateway = ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeployGateway');

  return await new DeployGateway({}).perform();
}

deployGatewayContract()
  .then(console.log)
  .catch(console.log);

// 16.AUX ->  Deploy Co Gateway Contract

async function deployCoGatewayContract() {
  let rootPrefix = '.',
    chainId = '2000';

  let chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig');
  let coreConstants = require(rootPrefix + '/config/coreConstants');
  let config = {};
  let rsp = await chainConfigProvider.getFor([chainId]);
  config = rsp[chainId];

  let OSTBase = require('@openstfoundation/openst-base');
  let InstanceComposer = OSTBase.InstanceComposer;

  let ic = new InstanceComposer(config);

  require(rootPrefix + '/tools/chainSetup/aux/DeployCoGateway');

  let DeployCoGateway = ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeployCoGateway');

  return await new DeployCoGateway({}).perform();
}

deployCoGatewayContract()
  .then(console.log)
  .catch(console.log);

// 17. ORIGIN -> Activate Gateway Contract

async function activateGatewayContract() {
  let rootPrefix = '.',
    chainId = '2000';

  let chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig');
  let coreConstants = require(rootPrefix + '/config/coreConstants');
  let config = {};
  let rsp = await chainConfigProvider.getFor([chainId]);
  config = rsp[chainId];

  let OSTBase = require('@openstfoundation/openst-base');
  let InstanceComposer = OSTBase.InstanceComposer;

  let ic = new InstanceComposer(config);

  require(rootPrefix + '/tools/chainSetup/origin/ActivateGateway');

  let ActivateGateway = ic.getShadowedClassFor(coreConstants.icNameSpace, 'ActivateGateway');

  return await new ActivateGateway({}).perform();
}

activateGatewayContract()
  .then(console.log)
  .catch(console.log);
