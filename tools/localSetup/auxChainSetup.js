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

    await oThis.checkIfOriginGethIsRunning();

    await oThis._getIc();

    logger.step('** Auxiliary Addresses Generation');
    let generatedAddresses = await oThis.generateAuxAddresses(),
      allocAddressToAmountMap = {},
      chainOwnerAddr = generatedAddresses.data.addressKindToValueMap.chainOwner;
    allocAddressToAmountMap[chainOwnerAddr] = '0xe567bd7e886312a0cf7397bb73650d2280400000000000000';
    let rsp = await gethManager.initChain(coreConstants.auxChainKind, oThis.auxChainId, allocAddressToAmountMap);

    logger.step('** Starting Auxiliary Geth for deployment.');
    await serviceManager.startGeth(coreConstants.auxChainKind, oThis.auxChainId, 'deployment');
    await basicHelper.pauseForMilliSeconds(5000);

    logger.step('* Setup base contract organization.');
    await oThis.setupAuxOrganization(chainAddressConstants.baseContractOrganizationKind);

    logger.step('* Setup auxiliary anchor organization.');
    await oThis.setupAuxOrganization(chainAddressConstants.anchorOrganizationKind);

    logger.step('** Deploying STPrime Contract');
    await oThis.deploySTPrime();

    logger.step('** Initialize STPrime Contract');
    await oThis.initializeSTPrime();

    logger.step('** Deploying origin anchor contract.');
    await oThis.deployOriginAnchor();

    logger.step('** Deploying auxiliary anchor contract.');
    await oThis.deployAuxAnchor();

    logger.step('** Set Origin Co anchor');
    await oThis.setCoAnchor(coreConstants.originChainKind);

    logger.step('** Set Aux Co anchor');
    await oThis.setCoAnchor(coreConstants.auxChainKind);

    logger.step('** Deploy libraries.');

    logger.log('* [Origin]: Deply MerklePatriciaProof');
    await oThis.deployLib(coreConstants.originChainKind, 'merklePatriciaProof');

    logger.log('* [Origin]: Deploy MessageBus');
    await oThis.deployLib(coreConstants.originChainKind, 'messageBus');

    logger.log('* [Origin]: Deploy GatewayLib');
    await oThis.deployLib(coreConstants.originChainKind, 'gateway');

    logger.log('* [Auxiliary]: Deply MerklePatriciaProof');
    await oThis.deployLib(coreConstants.auxChainKind, 'merklePatriciaProof');

    logger.log('* [Auxiliary]: Deploy MessageBus');
    await oThis.deployLib(coreConstants.auxChainKind, 'messageBus');

    logger.log('* [Auxiliary]: Deploy GatewayLib');
    await oThis.deployLib(coreConstants.auxChainKind, 'gateway');

    logger.step('** Deploying gateway contract');
    await oThis.deployGatewayContract();

    logger.step('** Deploying co gateway contract');
    await oThis.deployCoGatewayContract(); //TODO: add co-gateway address to OSTPrime contract

    logger.step('** Activate co gateway contract');
    await oThis.activateGatewayContract();

    logger.win('Deployment steps successfully performed on auxiliary chain :', oThis.auxChainId);
    process.exit(1);
  }

  async _getIc() {
    const oThis = this,
      rsp = await chainConfigProvider.getFor([oThis.auxChainId]),
      config = rsp[oThis.auxChainId];
    oThis.ic = new InstanceComposer(config);
  }

  async checkIfOriginGethIsRunning() {
    const oThis = this;
    logger.info('** Checking if origin geth running.');
    let cmd =
      'ps aux | grep geth | grep origin-' + oThis.originChainId + " | grep -v grep | tr -s ' ' | cut -d ' ' -f2";
    let processId = shell.exec(cmd).stdout;

    if (processId === '') {
      logger.error('Please start origin geth.');
      process.exit(1);
    } else {
      logger.info('* Origin geth running.');
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
      chainKind: coreConstants.auxChainKind,
      chainId: oThis.auxChainId
    });
    return await generateChainKnownAddressObj.perform();
  }

  async setupAuxOrganization(addressKind) {
    const oThis = this,
      SetupOrganization = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'SetupOrganization');

    return await new SetupOrganization({
      chainKind: coreConstants.auxChainKind,
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

  async deployOriginAnchor() {
    const oThis = this,
      rsp = await chainConfigProvider.getFor([oThis.originChainId]),
      config = rsp[oThis.originChainId],
      ic = new InstanceComposer(config),
      DeployAnchor = ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeployAnchor');

    return await new DeployAnchor({
      chainKind: chainAddressConstants.originChainKind,
      auxChainId: oThis.auxChainId
    }).perform();
  }

  async deployAuxAnchor() {
    const oThis = this;
    let DeployAnchor = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeployAnchor');
    return await new DeployAnchor({
      chainKind: coreConstants.auxChainKind,
      auxChainId: oThis.auxChainId
    }).perform();
  }

  async setCoAnchor(chainKind) {
    const oThis = this,
      SetCoAnchor = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'SetCoAnchor');
    return await new SetCoAnchor({ chainKind: chainKind, auxChainId: oThis.auxChainId }).perform();
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
    return await new DeployGateway({ auxChainId: oThis.auxChainId }).perform();
  }
  async deployCoGatewayContract() {
    const oThis = this,
      DeployCoGateway = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeployCoGateway');
    return await new DeployCoGateway({ auxChainId: oThis.auxChainId }).perform();
  }

  async activateGatewayContract() {
    const oThis = this,
      ActivateGateway = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'ActivateGateway');
    return await new ActivateGateway({ auxChainId: oThis.auxChainId }).perform();
  }
}

new AuxChainSetup({ originChainId: program.originChainId, auxChainId: program.auxChainId }).perform();
