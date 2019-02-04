'use strict';

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress');

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
          internal_error_identifier: 'l_s_ac_c_1',
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
    await oThis.setupAuxOrganization(chainAddressConstants.stPrimeOrgContractKind);

    logger.step('* Deploying organization for aux anchor.');
    await oThis.setupAuxOrganization(chainAddressConstants.auxAnchorOrgContractKind);

    logger.step('** Deploying STPrime');
    await oThis.deploySTPrime();

    logger.step('** Initialize STPrime Contract');
    await oThis.initializeSTPrime();

    logger.step('** Deploying origin anchor contract.');
    await oThis.deployOriginAnchor();

    logger.step('** Deploying auxiliary anchor contract.');
    await oThis.deployAuxAnchor();

    logger.step('** Set Co anchor in origin');
    await oThis.setCoAnchor(coreConstants.originChainKind);

    logger.step('** Set Co anchor in aux');
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

    logger.step('** Activate co-gateway in gateway contract');
    await oThis.activateGatewayContract();

    logger.step('** Setting co-gateway address to STPrime contract.');
    await oThis.setCoGatewayInSTPrime();

    logger.step('** Creating ST Prime economy.');
    await oThis.createEconomy();

    return true;
  }

  async _getIc() {
    logger.step('** Getting config strategy for aux chain.');
    const oThis = this,
      rsp = await chainConfigProvider.getFor([oThis.auxChainId]),
      config = rsp[oThis.auxChainId];

    oThis.chainEndpoint = config[configStrategyConstants.auxGeth][configStrategyConstants.gethReadOnly].wsProvider;

    oThis.blockTimestamp = parseInt((new Date().getTime() / 1000).toFixed(0));

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

    await new InitializeSimpleTokenPrime({ chainId: oThis.auxChainId }).perform();
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

  /**
   * This function inserts entry for OST Prime in DDB economy table.
   *
   * @return {Promise<void>}
   */
  async createEconomy() {
    const oThis = this;

    // Fetch addresses required for create economy service
    await oThis._fetchChainAddresses();

    let blockScannerObj = await blockScannerProvider.getInstance([oThis.auxChainId]),
      CreateEconomyKlass = blockScannerObj.economy.Create;

    let createEconomyObject = new CreateEconomyKlass(
      oThis.auxChainId,
      '18', // contract decimals, if not provided, defaults to 18
      oThis.kindToAddressMap['contractAddress'], // ST Prime contract address
      oThis.kindToAddressMap['simpleStakeAddress'], // simple stake contract address
      oThis.chainEndpoint, // provider endpoint
      oThis.blockTimestamp, // timestamp for ST Prime deployment, i.e. current time-stamp
      'OST Prime', // economy name
      '1', // conversion factor
      "OST'", // economy display symbol
      oThis.kindToAddressMap['originContractAddress'] // value branded token address (for STPrime, it will be ST contract address)
    );

    await createEconomyObject.perform();
    logger.step('Entry created in economies table in DynamoDB for OST Prime.');
  }

  /**
   * Fetch chain addresses
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchChainAddresses() {
    const oThis = this;

    oThis.kindToAddressMap = {};

    // Fetch all addresses associated with origin chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_ac_c_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.kindToAddressMap['originContractAddress'] =
      chainAddressesRsp.data[chainAddressConstants.stContractKind].address;

    // Fetch all addresses associated with aux chain id.
    let auxChainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      auxChainAddressesRsp = await auxChainAddressCacheObj.fetch();

    if (auxChainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_ac_c_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.kindToAddressMap['contractAddress'] =
      auxChainAddressesRsp.data[chainAddressConstants.stPrimeContractKind].address;

    oThis.kindToAddressMap['simpleStakeAddress'] =
      auxChainAddressesRsp.data[chainAddressConstants.stSimpleStakeContractKind].address;
  }
}

module.exports = AuxContractsSetup;
