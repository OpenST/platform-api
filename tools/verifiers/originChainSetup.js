'use strict';

/**
 * Objective is to verify the table data with the chain data.
 *
 * Usage:- node tools/verifiers/originChainSetup.js
 *
 * @module tools/verifiers/originChainSetup
 */

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  VerifiersHelper = require(rootPrefix + '/tools/verifiers/helper'),
  CoreAbis = require(rootPrefix + '/config/CoreAbis');

/**
 *
 */
class OriginChainSetup {
  constructor() {
    const oThis = this;

    oThis.web3Instance = null;
    oThis.verifiersHelper = null;
    oThis.chainId = null;
  }

  async validate() {
    const oThis = this;

    logger.step('** Setting up web3 object for origin chain.');
    await oThis._setWeb3Obj();

    logger.step('** Validating Simple Token Contract Address.');
    await oThis._validateSimpleTokenContract();

    logger.step('** Validating Simple Token Contract Organization.');
    await oThis._validateOrganization(chainAddressConstants.baseContractOrganizationKind);

    logger.step('** Validating Anchor Contract Organization.');
    await oThis._validateOrganization(chainAddressConstants.anchorOrganizationKind);

    logger.step('** Validating Libs.');
    await oThis._validateLib(chainAddressConstants.merklePatriciaProofLibKind);
    await oThis._validateLib(chainAddressConstants.messageBusLibKind);
    await oThis._validateLib(chainAddressConstants.gatewayLibKind);

    logger.win('* Origin Chain Setup Verification Done!!');

    process.exit(0);
    //return Promise.resolve();
  }

  async _setWeb3Obj() {
    const oThis = this;

    let csHelper = new ConfigStrategyHelper(0, 0),
      csResponse = await csHelper.getForKind(configStrategyConstants.originGeth),
      configForChain = csResponse.data[configStrategyConstants.originGeth];

    let readWriteConfig = configForChain[configStrategyConstants.gethReadWrite];
    oThis.chainId = configForChain.chainId;

    oThis.web3Instance = web3Provider.getInstance(readWriteConfig.wsProvider).web3WsProvider;
    oThis.verifiersHelper = new VerifiersHelper(oThis.web3Instance);
  }

  async _validateSimpleTokenContract() {
    const oThis = this;

    logger.log('* Fetching simple token contract address from database.');
    let queryForSTContractRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.chainId,
      kind: chainAddressConstants.baseContractKind
    });
    let dbSimpleTokenContractAddress = queryForSTContractRsp.data.address;

    logger.log('* Validating the deployed code on the address.');
    let rsp = await oThis.verifiersHelper.validateSimpleTokenContract(dbSimpleTokenContractAddress);
    if (!rsp) {
      logger.error('Deployment verification of simple token contract failed.');
      return Promise.reject();
    }

    logger.log('* Fetching simple token admin address from database.');
    let queryForAdminRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.chainId,
      kind: chainAddressConstants.simpleTokenAdminKind
    });
    let dbSimpleTokenAdminAddress = queryForAdminRsp.data.address;

    let simpleTokenContractObj = new oThis.web3Instance.eth.Contract(
      CoreAbis.simpleToken,
      dbSimpleTokenContractAddress
    );
    logger.log('* Validating the deployed code on the address.');

    let chainSimpleTokenAdminAddress = await simpleTokenContractObj.methods.adminAddress().call({});
    if (chainSimpleTokenAdminAddress.toLowerCase() !== dbSimpleTokenAdminAddress.toLowerCase()) {
      logger.error(
        'Admin address of simple token -',
        chainSimpleTokenAdminAddress,
        'different from database value -',
        dbSimpleTokenAdminAddress
      );
      return Promise.reject();
    }

    logger.log('* Checking whether simple token contract is finalized.');
    let chainIsFinalized = await simpleTokenContractObj.methods.finalized().call({});

    if (!chainIsFinalized) {
      logger.error('Simple Token Contract is not finalized.');
      return Promise.reject();
    } else {
      logger.log('Simple Token contract is finalized.');
    }
  }

  async _validateOrganization(organizationKind) {
    const oThis = this;

    logger.log('* Fetching', organizationKind, 'contract address from database.');
    let queryForOrganizationRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.chainId,
      kind: organizationKind
    });
    let dbOrganizationContractAddress = queryForOrganizationRsp.data.address;

    logger.log('* Fetching admin address from database.');
    let queryForAdminRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.chainId,
      kind: chainAddressConstants.adminKind
    });
    let dbAdminAddress = queryForAdminRsp.data.address;

    logger.log('* Fetching owner address from database.');
    let queryForOwnerRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.chainId,
      kind: chainAddressConstants.ownerKind
    });
    let dbAOwnerAddress = queryForOwnerRsp.data.address;

    logger.log('* Fetching worker addresses from database.');
    let queryForWorkerRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.chainId,
      kind: chainAddressConstants.workerKind
    });
    let dbWorkerAddresses = queryForWorkerRsp.data.addresses;

    logger.log('* Validating the deployed code on the organization address.');
    let rsp = await oThis.verifiersHelper.validateContract(
      dbOrganizationContractAddress,
      oThis.verifiersHelper.getOrganizationContractName
    );
    if (!rsp) {
      logger.error('Deployment verification of', organizationKind, 'organization contract failed.');
      return Promise.reject();
    }

    let organizationContractObj = await oThis.verifiersHelper.getContractObj(
      'Organization',
      dbOrganizationContractAddress
    );

    let chainAdmin = await organizationContractObj.methods.admin().call({});

    logger.log('* Validating the admin address with chain.');
    if (chainAdmin.toLowerCase() !== dbAdminAddress.toLowerCase()) {
      logger.error('Deployment verification of', organizationKind, 'failed.');
      Promise.reject();
    }

    let chainOwner = await organizationContractObj.methods.owner().call({});

    logger.log('* Validating the owner address with chain.');
    if (chainOwner.toLowerCase() !== dbAOwnerAddress.toLowerCase()) {
      logger.error('Deployment verification of', organizationKind, 'failed.');
      Promise.reject();
    }

    logger.log('* Validating the worker addresses with chain.');
    for (let i = 0; i < dbWorkerAddresses.length; i++) {
      let isWorkerResult = await organizationContractObj.methods.isWorker(dbWorkerAddresses[i]).call({});
      if (!isWorkerResult) {
        logger.error('Deployment verification of', organizationKind, 'failed.');
        Promise.reject();
      }
    }
  }

  async _validateLib(libKind) {
    const oThis = this;

    logger.info('*** Library:', libKind);
    logger.log('* Fetching', libKind, 'contract address from database.');
    let queryForLibRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.chainId,
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
}

new OriginChainSetup()
  .validate()
  .then()
  .catch();
