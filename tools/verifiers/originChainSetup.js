/**
 * Objective is to verify the table data with the chain data.
 *
 * Usage: node tools/verifiers/originChainSetup.js
 *
 * @module tools/verifiers/originChainSetup
 */

const rootPrefix = '../..',
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  VerifiersHelper = require(rootPrefix + '/tools/verifiers/Helper'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

/**
 * Class to verify the table data with the chain data.
 *
 * @class OriginChainSetup
 */
class OriginChainSetup {
  /**
   * Constructor to verify the table data with the chain data.
   *
   * @constructor
   */
  constructor() {
    const oThis = this;

    oThis.web3Instance = null;
    oThis.verifiersHelper = null;
    oThis.chainId = null;
  }

  /**
   * Validate.
   *
   * @return {Promise<void>}
   */
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
  }

  /**
   * Fetch required origin addresses
   *
   * @return {Promise}
   * @private
   */
  async _fetchOriginAddresses() {
    const oThis = this;

    // Fetch all addresses associated with origin chain id.
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
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
   * Set Origin web3 Obj.
   *
   * @sets oThis.web3Instance, oThis.verifiersHelper
   *
   * @return {Promise<void>}
   * @private
   */
  async _setWeb3Obj() {
    const oThis = this;

    const csHelper = new ConfigStrategyHelper(0, 0),
      csResponse = await csHelper.getForKind(configStrategyConstants.originGeth),
      configForChain = csResponse.data[configStrategyConstants.originGeth];

    const readWriteConfig = configForChain[configStrategyConstants.gethReadWrite];
    oThis.chainId = configForChain.chainId;

    oThis.web3Instance = web3Provider.getInstance(readWriteConfig.wsProvider).web3WsProvider;
    oThis.verifiersHelper = new VerifiersHelper(oThis.web3Instance);
  }

  /**
   * Validate simple token contract.
   *
   * @return {Promise<Promise<never> | Promise<any>>}
   * @private
   */
  async _validateSimpleTokenContract() {
    const oThis = this;

    logger.log('* Fetching simple token contract address from database.');
    const dbSimpleTokenContractAddress = oThis.simpleTokenContractAddress;

    logger.log('* Validating the deployed code on the address.');
    const rsp = await oThis.verifiersHelper.validateSimpleTokenContract(dbSimpleTokenContractAddress);
    if (!rsp) {
      logger.error('Deployment verification of simple token contract failed.');

      return Promise.reject(new Error('Deployment verification of simple token contract failed.'));
    }

    logger.log('* Fetching simple token admin address from database.');
    const dbSimpleTokenAdminAddress = oThis.stContractAdminAddress;

    logger.log('* Fetching simple token admin owner from database.');
    const dbSimpleTokenOwnerAddress = oThis.stContractOwnerAddress;

    const simpleTokenContractObj = new oThis.web3Instance.eth.Contract(
      CoreAbis.simpleToken,
      dbSimpleTokenContractAddress
    );

    logger.log('* Validating simple token admin address.');
    const chainSimpleTokenAdminAddress = await simpleTokenContractObj.methods.adminAddress().call({});
    if (chainSimpleTokenAdminAddress.toLowerCase() !== dbSimpleTokenAdminAddress.toLowerCase()) {
      logger.error(
        'Admin address of simple token -',
        chainSimpleTokenAdminAddress,
        'different from database value -',
        dbSimpleTokenAdminAddress
      );

      return Promise.reject(new Error('Admin address verification of simple token contract failed.'));
    }

    logger.log('* Validating simple token owner address.');
    const chainSimpleTokenOwnerAddress = await simpleTokenContractObj.methods.owner().call({});
    if (chainSimpleTokenOwnerAddress.toLowerCase() !== dbSimpleTokenOwnerAddress.toLowerCase()) {
      logger.error(
        'Admin address of simple token -',
        chainSimpleTokenOwnerAddress,
        'different from database value -',
        dbSimpleTokenOwnerAddress
      );

      return Promise.reject(new Error('Owner address verification of simple token contract failed.'));
    }

    logger.log('* Checking whether simple token contract is finalized.');
    const chainIsFinalized = await simpleTokenContractObj.methods.finalized().call({});

    if (!chainIsFinalized) {
      logger.error('Simple Token Contract is not finalized.');

      return Promise.reject(new Error('Simple Token Contract is not finalized.'));
    }
    logger.log('Simple Token contract is finalized.');
  }

  /**
   * Validate Simple Token & Origin Anchor organization contracts.
   *
   * @param {string} organizationKind
   *
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
        logger.error('unhandled organizationKind found: ', organizationKind);
        Promise.reject(new Error(`Unhandled organization kind found ${organizationKind}.`));
        break;
    }

    logger.log('* Validating the deployed code on the organization address.');
    const rsp = await oThis.verifiersHelper.validateContract(
      dbOrganizationContractAddress,
      oThis.verifiersHelper.getOrganizationContractName
    );
    if (!rsp) {
      logger.error('Deployment verification of', organizationKind, 'organization contract failed.');

      Promise.reject(new Error(`Deployment verification of  ${organizationKind} organization contract failed.`));
    }

    const organizationContractObj = await oThis.verifiersHelper.getContractObj(
      'Organization',
      dbOrganizationContractAddress
    );

    const chainAdmin = await organizationContractObj.methods.admin().call({});

    logger.log('* Validating the admin address with chain.');
    if (chainAdmin.toLowerCase() !== dbAdminAddress.toLowerCase()) {
      logger.error('Deployment verification of', organizationKind, 'failed.');
      Promise.reject(new Error(`Deployment verification of ${organizationKind} failed.`));
    }

    const chainOwner = await organizationContractObj.methods.owner().call({});

    logger.log('* Validating the owner address with chain.');
    if (chainOwner.toLowerCase() !== dbAOwnerAddress.toLowerCase()) {
      logger.error('Deployment verification of', organizationKind, 'failed.');
      Promise.reject(new Error(`Deployment verification of ${organizationKind} failed.`));
    }

    logger.log('* Validating the worker addresses with chain.');
    for (let index = 0; index < dbWorkerAddressesMap.length; index++) {
      const isWorkerResult = await organizationContractObj.methods
        .isWorker(dbWorkerAddressesMap[index].address)
        .call({});
      if (!isWorkerResult) {
        logger.error('Deployment verification of', organizationKind, 'failed.');
        Promise.reject(new Error(`Deployment verification of ${organizationKind} failed.`));
      }
    }
  }

  /**
   * Validate given library deployment
   *
   * @param {string} libKind
   *
   * @return {Promise<Promise<never> | Promise<any>>}
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
        logger.error('Unhandled libKind found: ', libKind);
        Promise.reject(new Error(`Unhandled libKind found: ${libKind}`));
        break;
    }

    logger.log('* Validating the deployed code on the', libKind, 'address.');
    const rsp = await oThis.verifiersHelper.validateContract(
      dbLibAddress,
      oThis.verifiersHelper.getLibNameFromKind(libKind)
    );
    if (!rsp) {
      logger.error('Deployment verification of', libKind, 'organization contract failed.');

      return Promise.reject(new Error(`Deployment verification of ${libKind} organization contract failed.`));
    }
  }
}

new OriginChainSetup()
  .validate()
  .then()
  .catch();
