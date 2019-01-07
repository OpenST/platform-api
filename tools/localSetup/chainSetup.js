'use strict';

const program = require('commander'),
  Web3 = require('web3'),
  OSTBase = require('@openstfoundation/openst-base');

const rootPrefix = '../..',
  InstanceComposer = OSTBase.InstanceComposer,
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

const GenerateChainKnownAddresses = require(rootPrefix + '/tools/helpers/GenerateChainKnownAddresses'),
  GeneratePrivateKey = require(rootPrefix + '/tools/helpers/GeneratePrivateKey');

require(rootPrefix + '/tools/chainSetup/origin/simpleToken/Deploy.js');
require(rootPrefix + '/tools/chainSetup/origin/simpleToken/SetAdminAddress');
require(rootPrefix + '/tools/chainSetup/origin/simpleToken/Finalize');
require(rootPrefix + '/tools/chainSetup/SetupOrganization');
require(rootPrefix + '/tools/chainSetup/DeployAnchor');

program.option('--originChainId <originChainId>', 'origin ChainId').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node tools/localSetup/chainSetup.js --originChainId 1000');
  logger.log('');
  logger.log('');
});

if (!program.originChainId) {
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
    oThis.chainId = params.originChainId;
  }

  /**
   *
   * Perform
   *
   * @return {Promise<result>}
   *
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('tools/localSetup/chainSetup.js::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 't_ls_cs_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
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
    await oThis.generateAndFundOriginAddr();

    logger.step('3] a). generate SimpleTokenOwner & SimpleTokenAdmin private keys.');
    let SimpleTokenOwnerDetails = await oThis.generateAddrAndPrivateKey(),
      SimpleTokenAdminDetails = await oThis.generateAddrAndPrivateKey(),
      simpleTokenOwnerAddress = SimpleTokenOwnerDetails.address,
      simpleTokenOwnerPrivateKey = SimpleTokenOwnerDetails.privateKey,
      simpleTokenAdmin = SimpleTokenAdminDetails.address,
      simpleTokenAdminPrivateKey = SimpleTokenAdminDetails.privateKey;

    logger.step('3] b). Fund SimpleTokenOwner & SimpleTokenAdmin with ETH on origin chain.');
    await oThis._fundAddressWithEth(SimpleTokenOwnerDetails.address);
    await oThis._fundAddressWithEth(SimpleTokenAdminDetails.address);

    logger.step('3] c). Deploy Simple Token.');
    await oThis.deploySimpleToken(simpleTokenOwnerAddress, simpleTokenOwnerPrivateKey);

    logger.step('3] d). Set Simple Token Admin.');
    await oThis.setSimpleTokenAdmin(simpleTokenOwnerAddress, simpleTokenOwnerPrivateKey, simpleTokenAdmin);

    logger.step('3] e). Finalize SimpleToken');
    await oThis.finalizeSimpleTokenAdmin(simpleTokenAdmin, simpleTokenAdminPrivateKey);

    logger.step('4. Insert simple token admin and owner address into chain addresses table.');
    await oThis.insertAdminOwnerIntoChainAddresses(simpleTokenOwnerAddress, simpleTokenAdmin);

    logger.step('5] a) Setup organization for simple token contract');
    await oThis.setupOriginOrganization(chainAddressConstants.baseContractOrganizationKind);

    logger.step('5] a) Setup organization for anchor');
    await oThis.setupOriginOrganization(chainAddressConstants.anchorOrganizationKind);

    logger.step('6. Deploying origin anchor.');
    await oThis.deployOriginAnchor();

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
      chainId: oThis.chainId
    });

    let generateOriginAddrRsp = await generateChainKnownAddresses.perform();

    if (generateOriginAddrRsp.isSuccess()) {
      logger.log('Origin Addresses Response: ', generateOriginAddrRsp.toHash());

      let addresses = generateOriginAddrRsp.data['addressKindToValueMap'],
        deployerAddr = addresses['deployer'],
        ownerAddr = addresses['owner'];

      logger.step('2. Funding Addresses with ETH.');
      await oThis._fundAddressWithEth(deployerAddr);
      await oThis._fundAddressWithEth(ownerAddr);
    } else {
      logger.error('deploySimpleToken failed');
      return Promise.reject();
    }
  }

  generateAddrAndPrivateKey() {
    let generatePrivateKey = new GeneratePrivateKey();
    let generatePrivateKeyRsp = generatePrivateKey.perform();
    return generatePrivateKeyRsp.data;
  }

  async deploySimpleToken(simpleTokenOwnerAddr, simpleTokenOwnerPrivateKey) {
    let configStrategyHelper = new ConfigStrategyHelper(0, 0),
      configRsp = await configStrategyHelper.getComplete(),
      ic = new InstanceComposer(configRsp.data);

    let DeploySimpleToken = ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeploySimpleToken'),
      deploySimpleToken = new DeploySimpleToken({
        signerAddress: simpleTokenOwnerAddr,
        signerKey: simpleTokenOwnerPrivateKey
      });

    let deploySimpleTokenRsp = await deploySimpleToken.perform();

    if (deploySimpleTokenRsp.isSuccess()) {
      return Promise.resolve();
    } else {
      logger.error('deploySimpleToken failed');
      return Promise.reject();
    }
  }

  async setSimpleTokenAdmin(simpleTokenOwnerAddr, simpleTokenOwnerPrivateKey, simpleTokenAdminAddr) {
    let configStrategyHelper = new ConfigStrategyHelper(0, 0),
      configRsp = await configStrategyHelper.getComplete(),
      ic = new InstanceComposer(configRsp.data);

    let SetSimpleTokenAdmin = ic.getShadowedClassFor(coreConstants.icNameSpace, 'SetSimpleTokenAdmin'),
      setSimpleTokenAdmin = new SetSimpleTokenAdmin({
        signerAddress: simpleTokenOwnerAddr,
        signerKey: simpleTokenOwnerPrivateKey,
        adminAddress: simpleTokenAdminAddr
      });

    let setSimpleTokenAdminRsp = await setSimpleTokenAdmin.perform();

    if (setSimpleTokenAdminRsp.isSuccess()) {
      return Promise.resolve();
    } else {
      logger.error('setSimpleTokenAdmin failed');
      return Promise.reject();
    }
  }

  async finalizeSimpleTokenAdmin(simpleTokenAdminAddr, simpleTokenAdminPrivateKey) {
    let configStrategyHelper = new ConfigStrategyHelper(0, 0),
      configRsp = await configStrategyHelper.getComplete(),
      ic = new InstanceComposer(configRsp.data);

    let FinalizeSimpleToken = ic.getShadowedClassFor(coreConstants.icNameSpace, 'FinalizeSimpleToken'),
      finalizeSimpleToken = new FinalizeSimpleToken({
        signerAddress: simpleTokenAdminAddr,
        signerKey: simpleTokenAdminPrivateKey
      });

    let finalizeSimpleTokenRsp = await finalizeSimpleToken.perform();

    if (finalizeSimpleTokenRsp.isSuccess()) {
      return Promise.resolve();
    } else {
      logger.error('finalizeSimpleToken failed');
      return Promise.reject();
    }
  }

  async insertAdminOwnerIntoChainAddresses(simpleTokenOwnerAddr, simpleTokenAdmin) {
    const oThis = this;

    await new ChainAddressModel().insertAddress({
      address: simpleTokenOwnerAddr,
      chainId: oThis.chainId,
      chainKind: chainAddressConstants.originChainKind,
      kind: chainAddressConstants.simpleTokenOwnerKind
    });
    await new ChainAddressModel().insertAddress({
      address: simpleTokenAdmin,
      chainId: oThis.chainId,
      chainKind: chainAddressConstants.originChainKind,
      kind: chainAddressConstants.simpleTokenAdminKind
    });
  }

  async setupOriginOrganization(addressKind) {
    const oThis = this,
      rsp = await chainConfigProvider.getFor([oThis.chainId]),
      config = rsp[oThis.chainId],
      ic = new InstanceComposer(config),
      SetupOrganization = ic.getShadowedClassFor(coreConstants.icNameSpace, 'SetupOrganization');

    return await new SetupOrganization({
      chainKind: chainAddressConstants.originChainKind,
      addressKind: addressKind
    }).perform();
  }

  async deployOriginAnchor() {
    const oThis = this,
      rsp = await chainConfigProvider.getFor([oThis.chainId]),
      config = rsp[oThis.chainId],
      ic = new InstanceComposer(config),
      DeployAnchor = ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeployAnchor');

    return await new DeployAnchor({ chainKind: chainAddressConstants.originChainKind }).perform();
  }

  async _fundAddressWithEth(address) {
    const oThis = this;

    let providers = await oThis._getProvidersFromConfig(),
      provider = providers.data[0], //select one provider from provider endpoints array
      web3ProviderInstance = await web3Provider.getInstance(provider),
      web3Instance = await web3ProviderInstance.web3WsProvider;

    let web3 = new Web3(web3Provider),
      txParams = {
        from: '0xead909d381251ee6976bf8e5b3ab667b092577e6', // address from keystore file is used as coinbase
        to: address,
        value: '2000000000000000000' //transfer amt in wei
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

  async _getProvidersFromConfig() {
    let csHelper = new ConfigStrategyHelper(0),
      csResponse = await csHelper.getForKind(configStrategyConstants.originGeth),
      configForChain = csResponse.data[configStrategyConstants.originGeth],
      readWriteConfig = configForChain[configStrategyConstants.gethReadWrite],
      providers = readWriteConfig.wsProvider ? readWriteConfig.wsProviders : readWriteConfig.rpcProviders;

    return Promise.resolve(responseHelper.successWithData(providers));
  }
}

new chainSetup({ originChainId: program.originChainId }).perform();
