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
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  VerifiersHelper = require(rootPrefix + '/tools/verifiers/Helper'),
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

    logger.step('** Fetch origin chain addresses.');
    await oThis._fetchOriginAddresses();

    logger.step('** Setting up web3 object for origin chain.');
    await oThis._setWeb3Obj();

    logger.step('** Validating Simple Token Contract Address.');
    await oThis._validateSimpleTokenContract();

    logger.step('** Validating Simple Token Contract Organization.');
    await oThis._validateOrganization(chainAddressConstants.stOrgContractKind);

    logger.step('** Validating Anchor Contract Organization.');
    await oThis._validateOrganization(chainAddressConstants.originAnchorOrgContractKind);

    logger.step('** Validating Libs.');
    await oThis._validateLib(chainAddressConstants.originMppLibContractKind);
    await oThis._validateLib(chainAddressConstants.originMbLibContractKind);
    await oThis._validateLib(chainAddressConstants.originGatewayLibContractKind);

    logger.win('* Origin Chain Setup Verification Done!!');

    process.exit(0);
    //return Promise.resolve();
  }

  /**
   * Fetch required origin addresses
   *
   * @return {Promise}
   *
   * @private
   */
  async _fetchOriginAddresses() {
    const oThis = this;

    // Fetch all addresses associated with origin chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_v_ocs_1',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.simpleTokenContractAddress = chainAddressesRsp.data[chainAddressConstants.stContractKind].address;
    oThis.stContractAdminAddress = chainAddressesRsp.data[chainAddressConstants.stContractAdminKind].address;
    oThis.stContractOwnerAddress = chainAddressesRsp.data[chainAddressConstants.stContractOwnerKind].address;

    oThis.stOrgContractAddress = chainAddressesRsp.data[chainAddressConstants.stOrgContractKind].address;
    oThis.stOrgContractAdminAddress = chainAddressesRsp.data[chainAddressConstants.stOrgContractAdminKind].address;
    oThis.stOrgContractOwnerAddress = chainAddressesRsp.data[chainAddressConstants.stOrgContractOwnerKind].address;

    oThis.originAnchorOrgContractAddress =
      chainAddressesRsp.data[chainAddressConstants.originAnchorOrgContractKind].address;
    oThis.originAnchorOrgContractAdminAddress =
      chainAddressesRsp.data[chainAddressConstants.originAnchorOrgContractAdminKind].address;
    oThis.originAnchorOrgContractOwnerAddress =
      chainAddressesRsp.data[chainAddressConstants.originAnchorOrgContractOwnerKind].address;

    oThis.originMppLibContractAddress = chainAddressesRsp.data[chainAddressConstants.originMppLibContractKind].address;
    oThis.originMbLibContractAddress = chainAddressesRsp.data[chainAddressConstants.originMbLibContractKind].address;
    oThis.originGatewayLibContractAddress =
      chainAddressesRsp.data[chainAddressConstants.originGatewayLibContractKind].address;

    oThis.stOrgContractWorkerAddresses = chainAddressesRsp.data[chainAddressConstants.stOrgContractWorkerKind];
    oThis.originAnchorOrgContractWorkerAddresses =
      chainAddressesRsp.data[chainAddressConstants.originAnchorOrgContractWorkerKind];
  }

  /**
   * Set Origin web3 Obj
   *
   * @return {Promise<void>}
   * @private
   */
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

  /**
   * Validate simple token contract
   *
   * @return {Promise<Promise<never> | Promise<any>>}
   * @private
   */
  async _validateSimpleTokenContract() {
    const oThis = this;

    logger.log('* Fetching simple token contract address from database.');
    let dbSimpleTokenContractAddress = oThis.simpleTokenContractAddress;

    logger.log('* Validating the deployed code on the address.');
    let rsp = await oThis.verifiersHelper.validateSimpleTokenContract(dbSimpleTokenContractAddress);
    if (!rsp) {
      logger.error('Deployment verification of simple token contract failed.');
      return Promise.reject();
    }

    logger.log('* Fetching simple token admin address from database.');
    let dbSimpleTokenAdminAddress = oThis.stContractAdminAddress;

    logger.log('* Fetching simple token admin owner from database.');
    let dbSimpleTokenOwnerAddress = oThis.stContractOwnerAddress;

    let simpleTokenContractObj = new oThis.web3Instance.eth.Contract(
      CoreAbis.simpleToken,
      dbSimpleTokenContractAddress
    );

    logger.log('* Validating simple token admin address.');
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

    logger.log('* Validating simple token owner address.');
    let chainSimpleTokenOwnerAddress = await simpleTokenContractObj.methods.owner().call({});
    if (chainSimpleTokenOwnerAddress.toLowerCase() !== dbSimpleTokenOwnerAddress.toLowerCase()) {
      logger.error(
        'Admin address of simple token -',
        chainSimpleTokenOwnerAddress,
        'different from database value -',
        dbSimpleTokenOwnerAddress
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

  /**
   * Validate Simple Token & Origin Anchor organization contracts
   *
   * @param organizationKind
   * @return {Promise<Promise<never> | Promise<any>>}
   * @private
   */
  async _validateOrganization(organizationKind) {
    const oThis = this;

    let dbOrganizationContractAddress = null,
      dbAdminAddress = null,
      dbAOwnerAddress = null,
      dbWorkerAddressesMap = null;

    logger.log('* Fetching', organizationKind, ' related contract addresses from database.');
    switch (organizationKind) {
      case chainAddressConstants.stOrgContractKind:
        dbOrganizationContractAddress = oThis.stOrgContractAddress;
        dbAdminAddress = oThis.stOrgContractAdminAddress;
        dbAOwnerAddress = oThis.stOrgContractOwnerAddress;
        dbWorkerAddressesMap = oThis.stOrgContractWorkerAddresses;
        break;
      case chainAddressConstants.originAnchorOrgContractKind:
        dbOrganizationContractAddress = oThis.originAnchorOrgContractAddress;
        dbAdminAddress = oThis.originAnchorOrgContractAdminAddress;
        dbAOwnerAddress = oThis.originAnchorOrgContractOwnerAddress;
        dbWorkerAddressesMap = oThis.originAnchorOrgContractWorkerAddresses;
        break;
      default:
        console.error('unhandled organizationKind found: ', organizationKind);
        Promise.reject();
        break;
    }

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
    for (let i = 0; i < dbWorkerAddressesMap.length; i++) {
      let isWorkerResult = await organizationContractObj.methods.isWorker(dbWorkerAddressesMap[i].address).call({});
      if (!isWorkerResult) {
        logger.error('Deployment verification of', organizationKind, 'failed.');
        Promise.reject();
      }
    }
  }

  /**
   * Validate given library deployment
   *
   * @param libKind
   *
   * @return {Promise<Promise<never> | Promise<any>>}
   *
   * @private
   */
  async _validateLib(libKind) {
    const oThis = this;

    logger.info('*** Library:', libKind);
    logger.log('* Fetching', libKind, 'contract address from database.');

    let dbLibAddress = null;

    logger.log('* Fetching', libKind, ' related contract addresses from database.');
    switch (libKind) {
      case chainAddressConstants.originMppLibContractKind:
        dbLibAddress = oThis.originMppLibContractAddress;
        break;
      case chainAddressConstants.originMbLibContractKind:
        dbLibAddress = oThis.originMbLibContractAddress;
        break;
      case chainAddressConstants.originGatewayLibContractKind:
        dbLibAddress = oThis.originGatewayLibContractAddress;
        break;
      default:
        console.error('unhandled libKind found: ', libKind);
        Promise.reject();
        break;
    }

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
