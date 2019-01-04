// 1. ORIGIN -> generate known addresses (for these private keys are stored in db)
//
// a. Deployer
// b. STPrimeOwner
// c. STPrimeAdmin
// d. ChainOwner
// e. Worker
//

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

// ############################################ 3. ORIGIN -> (START: For Non Production Main Env ONLY)  #################
//

///////////  a. generate SimpleTokenOwner & SimpleTokenAdmin private keys

function generatePrivateKey() {
  let Klass = require('./tools/helpers/GeneratePrivateKey.js');
  let obj = new Klass();
  let rsp = obj.perform();
  console.log(rsp);
  return rsp;
}

generatePrivateKey();
generatePrivateKey();

///////////  b. Fund SimpleTokenOwner & SimpleTokenAdmin with ETH on origin chain

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

let simpleTokenOwnerAddr = '0x7D7B4bb9d87b43ad1869C0652455F9BedDBe6b34';
let simpleTokenOwnerPrivateKey = '0x620887204dddb25fad1898789f7c111a6adc50623db6a991bee8b1afcc97b458';
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

let simpleTokenAdminAddr = '0xa6DF122c6E902802b56e77b94B8018da71d0B28a';
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

let simpleTokenAdminPrivateKey = '0x23ff308bf825352c962dd0dc16df29a93cefe37a096b946d17dfebb47a0e6dc4';
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

/////////// a. For Simple Token contract
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

  return await new InitializeSimpleTokenPrime({}).perform();
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
