'use strict';

/**
 * Objective is to verify the table data with the chain data.
 *
 * Usage:- node tools/verifiers/auxChainSetup.js
 *
 * @module tools/verifiers/auxChainSetup
 */
const program = require('commander');

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  VerifiersHelper = require(rootPrefix + '/tools/verifiers/helper');

program.option('--auxChainId <auxChainId>', 'aux ChainId').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node tools/verifiers/auxChainSetup.js --auxChainId 2000');
  logger.log('');
  logger.log('');
});

if (!program.auxChainId) {
  program.help();
  process.exit(1);
}

/**
 *
 */
class AuxChainSetup {
  constructor(params) {
    const oThis = this;
    oThis.auxChainId = params.auxChainId;

    oThis.originChainId = null;
    oThis.originWeb3Instance = null;
    oThis.auxWeb3Instance = null;
    oThis.verifiersHelper = null;
  }

  async validate() {
    const oThis = this;

    logger.step('** Setting up web3 object for aux chain.');
    await oThis._setWeb3Obj();

    logger.step('** Validating Simple Token Prime Contract.');
    await oThis._validateSimpleTokenPrimeContract();

    logger.step('** Validating Simple Token Prime Contract Organization.');
    await oThis._validateOrganization(chainAddressConstants.baseContractOrganizationKind);

    logger.step('** Validating Anchor Contract Organization.');
    await oThis._validateOrganization(chainAddressConstants.anchorOrganizationKind);

    logger.step('** Validating Anchor Contract.');
    await oThis._validateAnchor(chainAddressConstants.originAnchorContractKind);

    logger.step('** Validating Co-Anchor Contract.');
    await oThis._validateAnchor(chainAddressConstants.auxAnchorContractKind);

    logger.step('** Validating Aux Libs.');
    await oThis._validateLib(chainAddressConstants.merklePatriciaProofLibKind);
    await oThis._validateLib(chainAddressConstants.messageBusLibKind);
    await oThis._validateLib(chainAddressConstants.gatewayLibKind);

    await oThis._validateGatewayAndCoGateway();

    logger.win('* Auxiliary Chain Setup Verification Done!!');

    process.exit(0);
    //return Promise.resolve();
  }

  async _setWeb3Obj() {
    const oThis = this;

    let csResponse = await chainConfigProvider.getFor([oThis.auxChainId]),
      configForChain = csResponse[oThis.auxChainId][configStrategyConstants.auxGeth];

    let originReadWriteConfig = csResponse[oThis.auxChainId][configStrategyConstants.originGeth];

    oThis.originWeb3Instance = web3Provider.getInstance(
      originReadWriteConfig[configStrategyConstants.gethReadWrite].wsProvider
    ).web3WsProvider;
    oThis.originChainId = originReadWriteConfig.chainId;

    let auxReadWriteConfig = configForChain[configStrategyConstants.gethReadWrite];
    oThis.auxWeb3Instance = web3Provider.getInstance(auxReadWriteConfig.wsProvider).web3WsProvider;
    oThis.verifiersHelper = new VerifiersHelper(oThis.auxWeb3Instance);
  }

  async _validateSimpleTokenPrimeContract() {
    const oThis = this;

    logger.log('* Fetching simple token prime contract address from database.');
    let queryForSTContractRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.auxChainId,
      kind: chainAddressConstants.baseContractKind
    });
    let dbSimpleTokenPrimeContractAddress = queryForSTContractRsp.data.address;

    logger.log('* Fetching Co-Gateway contract address for this chain from database.');
    let queryCoGatewayRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.auxChainId,
      auxChainId: oThis.auxChainId,
      kind: chainAddressConstants.auxCoGatewayContractKind
    });
    let dbCoGatewayContractAddress = queryCoGatewayRsp.data.address;

    logger.log('* Validating the deployed code on the address.');
    let rsp = await oThis.verifiersHelper.validateContract(
      dbSimpleTokenPrimeContractAddress,
      oThis.verifiersHelper.getSimpleTokenPrimeContractName
    );

    if (!rsp) {
      logger.error('Deployment verification of simple token prime contract failed.');
      return Promise.reject();
    }

    let stPrimeContractObj = await oThis.verifiersHelper.getContractObj('OSTPrime', dbSimpleTokenPrimeContractAddress);

    logger.log('* Validating if OSTPrime is initialized or not.');
    let chainIsInitialized = await stPrimeContractObj.methods.initialized().call({});
    if (!chainIsInitialized) {
      logger.error('Deployment verification of OSTPrime initialized failed.');
      Promise.reject();
    }

    logger.log('* Validating if co-gateway is set for OSTPrime contract or not.');
    let chainCoGatewayAddress = await stPrimeContractObj.methods.coGateway().call({});

    if (dbCoGatewayContractAddress.toLowerCase() !== chainCoGatewayAddress.toLowerCase()) {
      logger.debug('chainCoGatewayAddress-------', chainCoGatewayAddress);
      logger.debug('dbCoGatewayContractAddress-------', dbCoGatewayContractAddress);
      logger.error('Co-gateway is not set for STPrime contract failed.');
      Promise.reject();
    }
  }

  async _validateOrganization(organizationKind) {
    const oThis = this;

    logger.log('* Fetching', organizationKind, 'contract address from database.');
    let queryForOrganizationRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.auxChainId,
      kind: organizationKind
    });
    let dbOrganizationContractAddress = queryForOrganizationRsp.data.address;

    logger.log('* Fetching admin address of', organizationKind, 'from database.');
    let queryForAdminRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.auxChainId,
      kind: chainAddressConstants.adminKind
    });
    let dbAdminAddress = queryForAdminRsp.data.address;

    logger.log('* Fetching owner address of', organizationKind, 'from database.');
    let queryForOwnerRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.auxChainId,
      kind: chainAddressConstants.ownerKind
    });
    let dbAOwnerAddress = queryForOwnerRsp.data.address;

    logger.log('* Fetching worker addresses of', organizationKind, 'from database.');
    let queryForWorkerRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.auxChainId,
      kind: chainAddressConstants.workerKind
    });
    let dbWorkerAddresses = queryForWorkerRsp.data.addresses;

    logger.log('* Validating the deployed code on the', organizationKind, 'address.');
    let rsp = await oThis.verifiersHelper.validateContract(
      dbOrganizationContractAddress,
      oThis.verifiersHelper.getOrganizationContractName
    );
    if (!rsp) {
      logger.error('Deployment verification of', organizationKind, 'organization contract failed.');
      return Promise.reject();
    }

    let organizationContractObj = await oThis.verifiersHelper.getContractObj(
      'organization',
      dbOrganizationContractAddress
    );

    let chainAdmin = await organizationContractObj.methods.admin().call({});

    logger.log('* Validating the admin address of', organizationKind, 'with chain.');
    if (chainAdmin.toLowerCase() !== dbAdminAddress.toLowerCase()) {
      logger.error('Deployment verification of', organizationKind, ' failed.');
      Promise.reject();
    }

    let chainOwner = await organizationContractObj.methods.owner().call({});

    logger.log('* Validating the owner address of', organizationKind, 'with chain.');
    if (chainOwner.toLowerCase() !== dbAOwnerAddress.toLowerCase()) {
      logger.error('Deployment verification of', organizationKind, ' failed.');
      Promise.reject();
    }

    logger.log('* Validating the worker addresses of', organizationKind, 'with chain.');
    for (let i = 0; i < dbWorkerAddresses.length; i++) {
      let isWorkerResult = await organizationContractObj.methods.isWorker(dbWorkerAddresses[i]).call({});
      if (!isWorkerResult) {
        logger.error('Deployment verification of', organizationKind, 'failed.');
        Promise.reject();
      }
    }
  }

  async _validateAnchor(anchorKind) {
    const oThis = this;

    let verifierHelperObj = null,
      chainId = null,
      remoteChainId = null,
      coAnchorAddress = null;

    if (anchorKind === chainAddressConstants.originAnchorContractKind) {
      verifierHelperObj = new VerifiersHelper(oThis.originWeb3Instance);
      chainId = oThis.originChainId;
      remoteChainId = parseInt(oThis.auxChainId);

      logger.log('* Fetching co-anchor address for anchor from database.');
      let queryForOrganizationRsp = await new ChainAddressModel().fetchAddress({
        chainId: oThis.auxChainId,
        auxChainId: oThis.auxChainId,
        kind: chainAddressConstants.auxAnchorContractKind
      });
      coAnchorAddress = queryForOrganizationRsp.data.address;
    } else {
      verifierHelperObj = new VerifiersHelper(oThis.auxWeb3Instance);
      chainId = oThis.auxChainId;
      remoteChainId = parseInt(oThis.originChainId);
      coAnchorAddress = '0x0000000000000000000000000000000000000000';
    }

    logger.log('* Fetching anchor organization address of from database.');
    let queryForOrganizationRsp = await new ChainAddressModel().fetchAddress({
      chainId: chainId,
      kind: chainAddressConstants.anchorOrganizationKind
    });
    let dbAnchorOrganizationAddress = queryForOrganizationRsp.data.address;

    logger.log('* Fetching anchor contract address of from database.');
    let queryForAnchorRsp = await new ChainAddressModel().fetchAddress({
      chainId: chainId,
      auxChainId: oThis.auxChainId,
      kind: anchorKind
    });
    let dbAnchorContractAddress = queryForAnchorRsp.data.address;

    logger.log('* Validating the deployed code on the', anchorKind, 'address.');
    let rsp = await verifierHelperObj.validateContract(
      dbAnchorContractAddress,
      verifierHelperObj.getAnchorContractName
    );
    if (!rsp) {
      logger.error('Deployment verification of', anchorKind, 'organization contract failed.');
      return Promise.reject();
    }

    let organizationContractObj = await verifierHelperObj.getContractObj('Anchor', dbAnchorContractAddress);

    logger.log('* Validating the anchor organization address.');
    let chainOrganizationAddress = await organizationContractObj.methods.organization().call({});
    if (chainOrganizationAddress.toLowerCase() !== dbAnchorOrganizationAddress.toLowerCase()) {
      logger.error('Deployment verification of anchor organization failed.');
      Promise.reject();
    }

    logger.log('* Validating the co-anchor address.');
    let chainCoAnchor = await organizationContractObj.methods.coAnchor().call({});
    if (coAnchorAddress.toLowerCase() !== chainCoAnchor.toLowerCase()) {
      logger.error('Deployment verification co-anchor address failed.');
      Promise.reject();
    }

    let chainRemoteChainId = await organizationContractObj.methods.getRemoteChainId().call({});
    if (parseInt(chainRemoteChainId) !== remoteChainId) {
      logger.error('Deployment verification of RemoteChainId parameter failed.');
      Promise.reject();
    }
  }

  async _validateLib(libKind) {
    const oThis = this;

    logger.info('** Library:', libKind);
    logger.log('* Fetching', libKind, 'contract address from database.');
    let queryForLibRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.auxChainId,
      kind: libKind
    });
    let dbLibAddress = queryForLibRsp.data.address;

    logger.log('* Validating the deployed code on the', libKind, 'address.');
    let rsp = await oThis.verifiersHelper.validateContract(
      dbLibAddress,
      oThis.verifiersHelper.getLibNameFromKind(libKind)
    );
    if (!rsp) {
      logger.error('Deployment verification of', libKind, 'organization contract failed.');
      return Promise.reject();
    }
  }

  async _validateGatewayAndCoGateway() {
    const oThis = this;

    logger.log('* Fetching Gateway contract address for this chain from database.');
    let queryGatewayRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.originChainId,
      auxChainId: oThis.auxChainId,
      kind: chainAddressConstants.originGatewayContractKind
    });
    let dbGatewayContractAddress = queryGatewayRsp.data.address;

    logger.log('* Fetching Co-Gateway contract address for this chain from database.');
    let queryCoGatewayRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.auxChainId,
      auxChainId: oThis.auxChainId,
      kind: chainAddressConstants.auxCoGatewayContractKind
    });
    let dbCoGatewayContractAddress = queryCoGatewayRsp.data.address;

    logger.log('* Fetching SimpleStake contract address for this chain from database.');
    let querySimpleStakeContractRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.originChainId,
      auxChainId: oThis.auxChainId,
      kind: chainAddressConstants.simpleStakeContractKind
    });
    let dbSimpleStakeContractAddress = querySimpleStakeContractRsp.data.addresses;

    logger.step('** Validating Gateway contract.');
    logger.log('* Validating the deployed code for Gateway address.');
    let rsp = await oThis.verifiersHelper.validateContract(
      dbGatewayContractAddress,
      oThis.verifiersHelper.getGatewayContractName
    );
    if (!rsp) {
      logger.error('Deployment verification of gateway contract failed.');
      return Promise.reject();
    }

    let verifierHelperObj = new VerifiersHelper(oThis.originWeb3Instance);
    let gatewayContract = await verifierHelperObj.getContractObj(
      verifierHelperObj.getGatewayContractName,
      dbGatewayContractAddress
    );

    logger.log('* Validating the Simple Stake contract address.');
    let chainStakeVaultAddress = await gatewayContract.methods.stakeVault().call({});
    if (dbSimpleStakeContractAddress[0].toLowerCase() !== chainStakeVaultAddress.toLowerCase()) {
      logger.error('Deployment verification Simple Stake contract address failed.');
      Promise.reject();
    }

    logger.log('* Validating if Gateway is activated or not.');
    let gatewayActivated = await gatewayContract.methods.activated().call({});
    if (!gatewayActivated) {
      logger.error('Deployment verification of Gateway Activation failed.');
      Promise.reject();
    }

    logger.log('* Validating the remote gateway contract address.');
    let chainRemoteGateway = await gatewayContract.methods.remoteGateway().call({});
    if (dbCoGatewayContractAddress.toLowerCase() !== chainRemoteGateway.toLowerCase()) {
      logger.error('Verification check for remote gateway contract address failed.');
      Promise.reject();
    }

    logger.step('** Validating Co-Gateway contract.');
    logger.log('* Validating the deployed code on the address.');
    let rsp1 = await oThis.verifiersHelper.validateContract(
      dbCoGatewayContractAddress,
      oThis.verifiersHelper.getCoGatewayContractName
    );
    if (!rsp1) {
      logger.error('Deployment verification of co-gateway contract failed.');
      return Promise.reject();
    }

    let coGatewayContract = await oThis.verifiersHelper.getContractObj(
      oThis.verifiersHelper.getCoGatewayContractName,
      dbCoGatewayContractAddress
    );

    //What is remoteGateway for co-gateway (getting baseContractOrganizationKind, kind = 5)
    logger.log('* Validating the remote gateway contract address.');
    let chainRemoteCoGateway = await coGatewayContract.methods.remoteGateway().call({});

    if (dbGatewayContractAddress.toLowerCase() !== chainRemoteCoGateway.toLowerCase()) {
      logger.error('Verification check for remote co-gateway contract address failed.');
      Promise.reject();
    }

    logger.log('* Validating if Co-gateway is activated or not.');
    let CoGatewayActivated = await gatewayContract.methods.activated().call({});
    if (!CoGatewayActivated) {
      logger.error('Deployment verification of Co-gateway Activation failed.');
      Promise.reject();
    }
  }
}

new AuxChainSetup({ auxChainId: program.auxChainId })
  .validate()
  .then()
  .catch();
