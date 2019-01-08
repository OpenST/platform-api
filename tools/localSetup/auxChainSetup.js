'use strict';
/**
 * Executable script for auxiliary chain setup.
 * This script generates addresses and performs contract deployments on origin chain.
 *
 * Prerequisites:-
 * 1. Origin Geth should be running already.
 *
 * Usage:- node tools/localSetup/auxChainSetup.js --originChainId 1000 --auxChainId 2000
 *
 * @module tools/localSetup/auxChainSetup
 */

// load shelljs and disable output
const shell = require('shelljs');
shell.config.silent = true;

const program = require('commander'),
  OSTBase = require('@openstfoundation/openst-base');

const rootPrefix = '../..',
  InstanceComposer = OSTBase.InstanceComposer,
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  gethManager = require(rootPrefix + '/tools/localSetup/gethManager'),
  serviceManager = require(rootPrefix + '/tools/localSetup/serviceManager'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  GenerateChainKnownAddresses = require(rootPrefix + '/tools/helpers/GenerateChainKnownAddresses');

require(rootPrefix + '/tools/chainSetup/DeployLib');
require(rootPrefix + '/tools/chainSetup/SetCoAnchor');
require(rootPrefix + '/tools/chainSetup/DeployAnchor');
require(rootPrefix + '/tools/chainSetup/SetupOrganization');
require(rootPrefix + '/tools/chainSetup/aux/DeployCoGateway');
require(rootPrefix + '/tools/chainSetup/origin/DeployGateway');
require(rootPrefix + '/tools/chainSetup/origin/ActivateGateway');
require(rootPrefix + '/tools/chainSetup/aux/simpleTokenPrime/Deploy');
require(rootPrefix + '/tools/chainSetup/aux/simpleTokenPrime/Initialize');

program
  .option('--originChainId <originChainId>', 'origin ChainId')
  .option('--auxChainId <auxChainId>', 'aux ChainId')
  .parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node tools/localSetup/auxChainSetup.js --originChainId 1000 --auxChainId 2000');
  logger.log('');
  logger.log('');
});

if (!program.originChainId || !program.auxChainId) {
  program.help();
  process.exit(1);
}

class AuxChainSetup {
  constructor(params) {
    const oThis = this;
    oThis.originChainId = params.originChainId;
    oThis.auxChainId = params.auxChainId;
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

    return oThis.asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('tools/localSetup/auxChainSetup.js::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 't_ls_acs_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  async asyncPerform() {
    const oThis = this;

    await oThis.checkOriginGeth();

    await oThis.getIc();

    logger.step('Generate aux addresses');
    let generatedAddresses = await oThis.generateAuxAddresses(),
      allocAddressToAmountMap = {},
      chainOwnerAddr = generatedAddresses.data.addressKindToValueMap.chainOwner;
    allocAddressToAmountMap[chainOwnerAddr] = '0xe567bd7e886312a0cf7397bb73650d2280400000000000000';
    let rsp = await gethManager.initChain(
      chainAddressConstants.auxChainKind,
      oThis.auxChainId,
      allocAddressToAmountMap
    );

    await serviceManager.startGeth(chainAddressConstants.auxChainKind, oThis.auxChainId, 'deployment');
    await basicHelper.pauseForMilliSeconds(10000);

    logger.step('Setup aux organization for St prime');
    await oThis.setupAuxOrganization(chainAddressConstants.baseContractOrganizationKind);

    logger.step('Setup aux organization for Anchor');
    await oThis.setupAuxOrganization(chainAddressConstants.anchorOrganizationKind);

    logger.step('Deploy ST Prime');
    await oThis.deploySTPrime();

    logger.step('Initialize ST Prime');
    await oThis.initializeSTPrime();

    logger.step('Deploying aux anchor');
    await oThis.deployAuxAnchor();

    logger.step('Set Origin Co anchor');
    await oThis.setCoAnchor(chainAddressConstants.originChainKind);

    logger.step('Set Aux Co anchor');
    await oThis.setCoAnchor(chainAddressConstants.auxChainKind);

    logger.step('Origin: Deploy merklePatriciaProof lib');
    await oThis.deployLib(chainAddressConstants.originChainKind, 'merklePatriciaProof');

    logger.step('Origin:  Deploy messageBus lib');
    await oThis.deployLib(chainAddressConstants.originChainKind, 'messageBus');

    logger.step('Origin:  Deploy gateway lib');
    await oThis.deployLib(chainAddressConstants.originChainKind, 'gateway');

    logger.step('Aux: Deploy merklePatriciaProof lib');
    await oThis.deployLib(chainAddressConstants.auxChainKind, 'merklePatriciaProof');

    logger.step('Aux:  Deploy messageBus lib');
    await oThis.deployLib(chainAddressConstants.auxChainKind, 'messageBus');

    logger.step('Aux:  Deploy gateway lib');
    await oThis.deployLib(chainAddressConstants.auxChainKind, 'gateway');

    logger.step('Deploying gateway contract');
    await oThis.deployGatewayContract();

    logger.step('Deploying co gateway contract');
    await oThis.deployCoGatewayContract(); //TODO: add cogateway addres to ostPtime

    logger.step('Activate co gateway contract');
    await oThis.activateGatewayContract();
    logger.win('Deployment steps successfully performed on aux chain.');
    process.exit(1);
  }

  async getIc() {
    const oThis = this,
      rsp = await chainConfigProvider.getFor([oThis.auxChainId]),
      config = rsp[oThis.auxChainId];
    oThis.ic = new InstanceComposer(config);
  }

  async checkOriginGeth() {
    const oThis = this;
    let cmd =
      'ps aux | grep geth | grep origin-' + oThis.originChainId + " | grep -v grep | tr -s ' ' | cut -d ' ' -f2";
    let processId = shell.exec(cmd).stdout;

    console.log('processId', processId);
    if (processId === '') {
      logger.error('Please start origin geth.');
      process.exit(1);
    } else {
      logger.info('Origin Geth running.');
    }
  }

  async generateAuxAddresses() {
    const oThis = this;
    let generateChainKnownAddressObj = new GenerateChainKnownAddresses({
      addressKinds: [
        chainAddressConstants.deployerKind,
        chainAddressConstants.ownerKind,
        chainAddressConstants.adminKind,
        chainAddressConstants.chainOwnerKind,
        chainAddressConstants.workerKind
      ],
      chainKind: chainAddressConstants.auxChainKind,
      chainId: oThis.auxChainId
    });
    return await generateChainKnownAddressObj.perform();
  }

  async setupAuxOrganization(addressKind) {
    const oThis = this,
      SetupOrganization = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'SetupOrganization');

    return await new SetupOrganization({
      chainKind: chainAddressConstants.auxChainKind,
      addressKind: addressKind
    }).perform();
  }

  async deploySTPrime() {
    const oThis = this,
      DeploySimpleTokenPrime = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeploySimpleTokenPrime');
    return await new DeploySimpleTokenPrime({}).perform();
  }

  async initializeSTPrime() {
    const oThis = this,
      InitializeSimpleTokenPrime = oThis.ic.getShadowedClassFor(
        coreConstants.icNameSpace,
        'InitializeSimpleTokenPrime'
      );

    return await new InitializeSimpleTokenPrime({ chainId: oThis.auxChainId }).perform();
  }

  async deployAuxAnchor() {
    const oThis = this;
    let DeployAnchor = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeployAnchor');
    return await new DeployAnchor({ chainKind: chainAddressConstants.auxChainKind }).perform();
  }

  async setCoAnchor(chainKind) {
    const oThis = this,
      SetCoAnchor = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'SetCoAnchor');
    return await new SetCoAnchor({ chainKind: chainKind }).perform();
  }

  async deployLib(chainKind, libKind) {
    const oThis = this,
      DeployLib = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeployLib');

    return await new DeployLib({
      chainKind: chainKind,
      libKind: libKind
    }).perform();
  }

  async deployGatewayContract() {
    // Deployment of gateway contract is done on origin chain.
    const oThis = this,
      rsp = await chainConfigProvider.getFor([oThis.originChainId]),
      config = rsp[oThis.originChainId],
      ic = new InstanceComposer(config),
      DeployGateway = ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeployGateway');
    return await new DeployGateway({}).perform();
  }
  async deployCoGatewayContract() {
    const oThis = this,
      DeployCoGateway = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeployCoGateway');
    return await new DeployCoGateway({}).perform();
  }

  async activateGatewayContract() {
    const oThis = this,
      ActivateGateway = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'ActivateGateway');
    return await new ActivateGateway({}).perform();
  }
}

new AuxChainSetup({ originChainId: program.originChainId, auxChainId: program.auxChainId }).perform();
