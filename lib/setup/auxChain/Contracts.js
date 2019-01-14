'use strict';

const OSTBase = require('@openstfoundation/openst-base');

const rootPrefix = '../../..',
  InstanceComposer = OSTBase.InstanceComposer,
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

require(rootPrefix + '/tools/chainSetup/DeployLib');
require(rootPrefix + '/tools/chainSetup/SetCoAnchor');
require(rootPrefix + '/tools/chainSetup/DeployAnchor');
require(rootPrefix + '/tools/chainSetup/SetupOrganization');
require(rootPrefix + '/tools/chainSetup/aux/DeployCoGateway');
require(rootPrefix + '/tools/chainSetup/origin/DeployGateway');
require(rootPrefix + '/tools/chainSetup/origin/ActivateGateway');
require(rootPrefix + '/tools/chainSetup/aux/simpleTokenPrime/Deploy');
require(rootPrefix + '/tools/chainSetup/aux/SetCoGatewayInOSTPrime');
require(rootPrefix + '/tools/chainSetup/aux/simpleTokenPrime/Initialize');

class AuxContractsSetup {
  constructor(originChainId, auxChainId) {
    const oThis = this;
    oThis.originChainId = originChainId;
    oThis.auxChainId = auxChainId;
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
        logger.error('lib/setup/auxChain/Contracts.js::perform::catch');
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

    await oThis._getIc();

    logger.step('* Deploying organization for simple token prime.');
    await oThis.setupAuxOrganization(chainAddressConstants.baseContractOrganizationKind);

    logger.step('* Deploying organization for aux anchor.');
    await oThis.setupAuxOrganization(chainAddressConstants.anchorOrganizationKind);

    logger.step('** Deploying STPrime');
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

    logger.log('* [Auxiliary]: Deply MerklePatriciaProof');
    await oThis.deployLib(coreConstants.auxChainKind, 'merklePatriciaProof');

    logger.log('* [Auxiliary]: Deploy MessageBus');
    await oThis.deployLib(coreConstants.auxChainKind, 'messageBus');

    logger.log('* [Auxiliary]: Deploy GatewayLib');
    await oThis.deployLib(coreConstants.auxChainKind, 'gateway');

    logger.step('** Deploying gateway contract');
    await oThis.deployGatewayContract();

    logger.step('** Deploying co-gateway contract');
    await oThis.deployCoGatewayContract();

    logger.step('** Setting co-gateway address to STPrime contract.');
    await oThis.setCoGatewayInSTPrime();

    logger.step('** Activate co gateway contract');
    await oThis.activateGatewayContract();

    return true;
  }

  async _getIc() {
    logger.step('** Getting config strategy for aux chain.');
    const oThis = this,
      rsp = await chainConfigProvider.getFor([oThis.auxChainId]),
      config = rsp[oThis.auxChainId];
    // TODO - check if config strategy entries are present in db.
    oThis.ic = new InstanceComposer(config);
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
      chainKind: coreConstants.originChainKind,
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

  async setCoGatewayInSTPrime() {
    const oThis = this,
      SetCoGatewayInOSTPrime = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'SetCoGatewayInOSTPrime');
    return await new SetCoGatewayInOSTPrime({ auxChainId: oThis.auxChainId }).perform();
  }
}

module.exports = AuxContractsSetup;
