'use strict';

const rootPrefix = '../..',
  program = require('commander'),
  Web3 = require('web3'),
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

const GenerateChainKnownAddresses = require(rootPrefix + '/tools/helpers/GenerateChainKnownAddresses'),
  GeneratePrivateKey = require(rootPrefix + '/tools/helpers/GeneratePrivateKey');

require(rootPrefix + '/tools/chainSetup/origin/simpleToken/Deploy.js');
require(rootPrefix + '/tools/chainSetup/origin/simpleToken/SetAdminAddress');
require(rootPrefix + '/tools/chainSetup/origin/simpleToken/Finalize');

program.option('--originChainId <originChainId>', 'origin ChainId').parse(process.argv);
program.option('--auxChainId <auxChainId>', 'aux ChainId').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node tools/localSetup/chainSetup.js --originChainId 1000 --auxChainId 2000');
  logger.log('');
  logger.log('');
});

if (!program.originChainId || !program.auxChainId) {
  program.help();
  process.exit(1);
}

class chainSetup {
  /**
   * Constructor
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;
    oThis.originChainId = params.originChainId;
    oThis.auxChainId = params.auxChainId;
  }

  /**
   *
   * async perform
   *
   * @return {Promise<result>}
   *
   */
  async _asyncPerform() {
    const oThis = this;

    logger.step('1. Origin Addresses Generation');
    logger.step('2. Funding Addresses with ETH.');
    await oThis.generateAndFundOriginAddr();

    logger.step('3] a). generate SimpleTokenOwner & SimpleTokenAdmin private keys.');
    let SimpleTokenOwnerDetails = await oThis.generateAddrAndPrivateKey();
    let SimpleTokenAdminDetails = await oThis.generateAddrAndPrivateKey();

    logger.step('3] b). Fund SimpleTokenOwner & SimpleTokenAdmin with ETH on origin chain.');
    await oThis._fundAddressWithEth(oThis.originChainId, SimpleTokenOwnerDetails.address, 2);
    await oThis._fundAddressWithEth(oThis.originChainId, SimpleTokenAdminDetails.address, 2);

    logger.step('3] c). Deploy Simple Token.');
    await oThis.deploySimpleToken(SimpleTokenOwnerDetails.address, SimpleTokenOwnerDetails.privateKey);

    logger.step('3] d). Set Simple Token Admin.');
    await oThis.setSimpleTokenAdmin(
      SimpleTokenOwnerDetails.address,
      SimpleTokenOwnerDetails.privateKey,
      SimpleTokenAdminDetails.address
    );

    logger.step('3] e). Finalize SimpleToken');
    await oThis.finalizeSimpleTokenAdmin(SimpleTokenAdminDetails.address, SimpleTokenAdminDetails.privateKey);

    return Promise.resolve();
  }

  async generateAndFundOriginAddr() {
    const oThis = this;

    let generateChainKnownAddresses = new GenerateChainKnownAddresses({
      addressKinds: [
        chainAddressConstants.deployerKind,
        chainAddressConstants.ownerKind,
        chainAddressConstants.adminKind,
        chainAddressConstants.workerKind
      ],
      chainKind: chainAddressConstants.originChainKind,
      chainId: oThis.originChainId
    });

    let generateOriginAddrRsp = await generateChainKnownAddresses.perform();

    console.log('Origin Addresses Response: ', generateOriginAddrRsp.toHash());

    let addresses = generateOriginAddrRsp.data['addressKindToValueMap'],
      deployerAddr = addresses['deployer'],
      ownerAddr = addresses['owner'];

    await oThis._fundAddressWithEth(deployerAddr, 2);
    await oThis._fundAddressWithEth(ownerAddr, 2);
  }

  generateAddrAndPrivateKey() {
    let generatePrivateKey = new GeneratePrivateKey();
    let generatePrivateKeyRsp = generatePrivateKey.perform();
    return generatePrivateKeyRsp.data;
  }

  async deploySimpleToken(simpleTokenOwnerAddr, simpleTokenOwnerPrivateKey) {
    const oThis = this;

    let configStrategyHelper = new ConfigStrategyHelper(0, 0),
      configRsp = await configStrategyHelper.getComplete(),
      ic = new InstanceComposer(configRsp.data);

    let DeploySimpleToken = ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeploySimpleToken'),
      deploySimpleToken = new DeploySimpleToken({
        signerAddress: simpleTokenOwnerAddr,
        signerKey: simpleTokenOwnerPrivateKey
      });

    return await deploySimpleToken.perform();
  }

  async setSimpleTokenAdmin(simpleTokenOwnerAddr, simpleTokenOwnerPrivateKey, simpleTokenAdminAddr) {
    const oThis = this;

    let configStrategyHelper = new ConfigStrategyHelper(0, 0),
      configRsp = await configStrategyHelper.getComplete(),
      ic = new InstanceComposer(configRsp.data);

    let SetSimpleTokenAdmin = ic.getShadowedClassFor(coreConstants.icNameSpace, 'SetSimpleTokenAdmin'),
      setSimpleTokenAdmin = new SetSimpleTokenAdmin({
        signerAddress: simpleTokenOwnerAddr,
        signerKey: simpleTokenOwnerPrivateKey,
        adminAddress: simpleTokenAdminAddr
      });

    return await setSimpleTokenAdmin.perform();
  }

  async finalizeSimpleTokenAdmin(simpleTokenAdminAddr, simpleTokenAdminPrivateKey) {
    const oThis = this;

    let configStrategyHelper = new ConfigStrategyHelper(0, 0),
      configRsp = await configStrategyHelper.getComplete(),
      ic = new InstanceComposer(configRsp.data);

    let FinalizeSimpleToken = ic.getShadowedClassFor(coreConstants.icNameSpace, 'FinalizeSimpleToken'),
      finalizeSimpleToken = new FinalizeSimpleToken({
        signerAddress: simpleTokenAdminAddr,
        signerKey: simpleTokenAdminPrivateKey
      });

    return await finalizeSimpleToken.perform();
  }

  async _fundAddressWithEth(chainId, address, value) {
    const oThis = this;

    let providers = await oThis._getProvidersFromConfig(chainId),
      provider = providers.data[0], //select one provider from provider endpoints array
      web3ProviderInstance = await web3Provider.getInstance(provider),
      web3Instance = await web3ProviderInstance.web3WsProvider;

    console.log('provider------', provider);

    let web3 = new Web3(web3Provider),
      txParams = {
        from: 'eth.coinbase',
        to: address,
        value: web3.toWei(value, 'ether')
      };

    await web3Instance.eth
      .sendTransaction(txParams)
      .then(function(response) {
        logger.info('Successfully funded', response);
        Promise.resolve();
      })
      .catch(function(error) {
        logger.error(error);
        Promise.reject();
      });
  }

  async _getProvidersFromConfig(chainId) {
    const oThis = this;

    let csHelper = new ConfigStrategyHelper(chainId),
      csResponse = await csHelper.getForKind(configStrategyConstants.originGeth),
      configForChain = csResponse.data[configStrategyConstants.originGeth],
      readWriteConfig = configForChain[configStrategyConstants.gethReadWrite],
      providers = readWriteConfig.wsProvider ? readWriteConfig.wsProviders : readWriteConfig.rpcProviders;

    return Promise.resolve(responseHelper.successWithData(providers));
  }
}

new chainSetup({ originChainId: program.originChainId, auxChainId: program.auxChainId }).perform();
