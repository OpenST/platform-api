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
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  VerifiersHelper = require(rootPrefix + '/tools/verifiers/Helper'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  contractNameConstants = require(rootPrefix + '/lib/globalConstant/contractName'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  stakeCurrencyConstants = require(rootPrefix + '/lib/globalConstant/stakeCurrency'),
  StakeCurrencyModel = require(rootPrefix + '/app/models/mysql/StakeCurrency'),
  StakeCurrencyBySymbolCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyBySymbol'),
  AuxPriceOracleModel = require(rootPrefix + '/app/models/mysql/AuxPriceOracle'),
  AllQuoteCurrencySymbols = require(rootPrefix + '/lib/cacheManagement/shared/AllQuoteCurrencySymbols'),
  QuoteCurrencyBySymbolCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/QuoteCurrencyBySymbol');

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
  /**
   * constructor
   *
   * @param params
   */
  constructor(params) {
    const oThis = this;
    oThis.auxChainId = params.auxChainId;

    oThis.originChainId = null;
    oThis.originWeb3Instance = null;
    oThis.auxWeb3Instance = null;
    oThis.verifiersHelper = null;
    oThis.allStakeCurrencySymbols = [];
  }

  /**
   * Validate aux chain setup
   *
   * @return {Promise<void>}
   */
  async validate() {
    const oThis = this;

    logger.step('** Fetch aux chain addresses');
    await oThis._fetchAuxAddresses();

    logger.step('** Fetch origin chain addresses');
    await oThis._fetchOriginAddresses();

    logger.step('** Fetch stake currency details');
    await oThis._fetchStakeCurrencyDetails();

    logger.step('** Setting up web3 object for aux chain.');
    await oThis._setWeb3Obj();

    logger.step('** Validating Simple Token Prime Contract.');
    await oThis._validateSimpleTokenPrimeContract();

    logger.step('** Validating Simple Token Prime Contract Organization.');
    await oThis._validateOrganization(chainAddressConstants.stPrimeOrgContractKind);

    logger.step('** Validating Anchor Contract Organization.');
    await oThis._validateOrganization(chainAddressConstants.auxAnchorOrgContractKind);

    logger.step('** Validating Anchor Contract.');
    await oThis._validateAnchor(chainAddressConstants.originAnchorContractKind);

    logger.step('** Validating Co-Anchor Contract.');
    await oThis._validateAnchor(chainAddressConstants.auxAnchorContractKind);

    logger.step('** Validating Aux Libs.');
    await oThis._validateLib(chainAddressConstants.auxMppLibContractKind);
    await oThis._validateLib(chainAddressConstants.auxMbLibContractKind);
    await oThis._validateLib(chainAddressConstants.auxGatewayLibContractKind);

    await oThis._validateGatewayAndCoGateway();

    logger.step('** Validating Price Oracle contracts.');

    await oThis.validateAllPriceOracleContracts();

    logger.win('* Auxiliary Chain Setup Verification Done!!');

    process.exit(0);
    //return Promise.resolve();
  }

  /**
   * This function validates price oracle of all stake currencies.
   *
   * @returns {Promise<Promise<never> | Promise<any>>}
   */
  async validateAllPriceOracleContracts() {
    const oThis = this;

    for (let i = 0; i < oThis.allStakeCurrencySymbols.length; i++) {
      await oThis._validatePriceOracleContract(oThis.allStakeCurrencySymbols[i]);
    }
  }

  /**
   * Fetch required aux addresses
   *
   * @return {Promise}
   *
   * @private
   */
  async _fetchAuxAddresses() {
    const oThis = this;

    // Fetch all addresses associated with aux chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_v_acs_1',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.stPrimeContractAddress = chainAddressesRsp.data[chainAddressConstants.stPrimeContractKind].address;
    oThis.stPrimeOrgContractAddress = chainAddressesRsp.data[chainAddressConstants.stPrimeOrgContractKind].address;
    oThis.auxAnchorContractAddress = chainAddressesRsp.data[chainAddressConstants.auxAnchorContractKind].address;
    oThis.auxAnchorOrgContractAddress = chainAddressesRsp.data[chainAddressConstants.auxAnchorOrgContractKind].address;
    oThis.originAnchorContractAddress = chainAddressesRsp.data[chainAddressConstants.originAnchorContractKind].address;
    oThis.auxCoGatewayContractAddress = chainAddressesRsp.data[chainAddressConstants.auxCoGatewayContractKind].address;
    oThis.originGatewayContractAddress =
      chainAddressesRsp.data[chainAddressConstants.originGatewayContractKind].address;
    oThis.stSimpleStakeContractAddress =
      chainAddressesRsp.data[chainAddressConstants.stSimpleStakeContractKind].address;

    oThis.auxMppLibContractAddress = chainAddressesRsp.data[chainAddressConstants.auxMppLibContractKind].address;
    oThis.auxMbLibContractAddress = chainAddressesRsp.data[chainAddressConstants.auxMbLibContractKind].address;
    oThis.auxGatewayLibContractAddress =
      chainAddressesRsp.data[chainAddressConstants.auxGatewayLibContractKind].address;

    oThis.stPrimeOrgContractAdminAddress =
      chainAddressesRsp.data[chainAddressConstants.stPrimeOrgContractAdminKind].address;
    oThis.auxAnchorOrgContractAdminAddress =
      chainAddressesRsp.data[chainAddressConstants.auxAnchorOrgContractAdminKind].address;
    oThis.stPrimeOrgContractOwnerAddress =
      chainAddressesRsp.data[chainAddressConstants.stPrimeOrgContractOwnerKind].address;
    oThis.auxAnchorOrgContractOwnerAddress =
      chainAddressesRsp.data[chainAddressConstants.auxAnchorOrgContractOwnerKind].address;
    oThis.stPrimeOrgContractWorkerAddresses =
      chainAddressesRsp.data[chainAddressConstants.stPrimeOrgContractWorkerKind];
    oThis.auxAnchorOrgContractWorkerAddresses =
      chainAddressesRsp.data[chainAddressConstants.auxAnchorOrgContractWorkerKind];

    oThis.auxOstToUsdPriceOracleContractKind =
      chainAddressesRsp.data[chainAddressConstants.auxOstToUsdPriceOracleContractKind].address;
    oThis.auxUsdcToUsdPriceOracleContractKind =
      chainAddressesRsp.data[chainAddressConstants.auxUsdcToUsdPriceOracleContractKind].address;

    oThis.auxPriceOracleContractOwnerKind =
      chainAddressesRsp.data[chainAddressConstants.auxPriceOracleContractOwnerKind].address;
    oThis.auxPriceOracleContractAdminKind =
      chainAddressesRsp.data[chainAddressConstants.auxPriceOracleContractAdminKind].address;
    oThis.auxPriceOracleContractWorkerKind =
      chainAddressesRsp.data[chainAddressConstants.auxPriceOracleContractWorkerKind][0].address;
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
          internal_error_identifier: 't_v_acs_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.stOrgContractAddress = chainAddressesRsp.data[chainAddressConstants.stOrgContractKind].address;
    oThis.originAnchorOrgContractAddress =
      chainAddressesRsp.data[chainAddressConstants.originAnchorOrgContractKind].address;
  }

  /**
   * Fetch details of all stake currencies.
   *
   * @returns {Promise<Promise<never> | Promise<any>>}
   * @private
   */
  async _fetchStakeCurrencyDetails() {
    const oThis = this;

    let stakeCurrenciesDetails = await new StakeCurrencyModel()
      .select('symbol')
      .where({ status: stakeCurrencyConstants.invertedStatuses[stakeCurrencyConstants.setupInProgressStatus] })
      .fire();

    for (let i = 0; i < stakeCurrenciesDetails.length; i++) {
      oThis.allStakeCurrencySymbols.push(stakeCurrenciesDetails[i].symbol);
    }

    const stakeCurrencyDetails = await new StakeCurrencyBySymbolCache({
      stakeCurrencySymbols: oThis.allStakeCurrencySymbols
    }).fetch();

    if (stakeCurrencyDetails.isFailure()) {
      logger.error('Error in fetch stake currency details');
      return Promise.reject();
    }

    oThis.allStakeCurrencyDetails = stakeCurrencyDetails.data;
    oThis.stContractAddress = oThis.allStakeCurrencyDetails[stakeCurrencyConstants.OST].contractAddress;
  }

  /**
   * Set web3 object for Aux chain
   *
   * @return {Promise<void>}
   * @private
   */
  async _setWeb3Obj() {
    const oThis = this;

    let csResponse = await chainConfigProvider.getFor([oThis.auxChainId]),
      configForChain = csResponse[oThis.auxChainId][configStrategyConstants.auxGeth];

    let originReadWriteConfig = csResponse[oThis.auxChainId][configStrategyConstants.originGeth];

    oThis.originWeb3Instance = web3Provider.getInstance(
      originReadWriteConfig[configStrategyConstants.gethReadWrite].wsProvider
    ).web3WsProvider;
    oThis.originChainId = originReadWriteConfig.chainId;

    if (oThis.originChainId == oThis.auxChainId)
      return Promise.reject('Origin chain id cannot be same as aux chain id.');

    let auxReadWriteConfig = configForChain[configStrategyConstants.gethReadWrite];
    oThis.auxWeb3Instance = web3Provider.getInstance(auxReadWriteConfig.wsProvider).web3WsProvider;
    oThis.verifiersHelper = new VerifiersHelper(oThis.auxWeb3Instance);
  }

  /**
   * Validate simple token prime contract deployement
   *
   * @return {Promise<Promise<never> | Promise<any>>}
   * @private
   */
  async _validateSimpleTokenPrimeContract() {
    const oThis = this;

    logger.log('* Fetching simple token prime contract address from database.');
    let dbSimpleTokenPrimeContractAddress = oThis.stPrimeContractAddress;

    logger.log('* Fetching Co-Gateway contract address for this chain from database.');
    let dbCoGatewayContractAddress = oThis.auxCoGatewayContractAddress;

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

    logger.log('* Validating if OSTPrime organization contract address.');
    let chainStPrimeOrganizationContractAddress = await stPrimeContractObj.methods.organization().call({});

    let dbStPrimeOrganizationContractAddress = oThis.stPrimeOrgContractAddress;

    if (dbStPrimeOrganizationContractAddress.toLowerCase() !== chainStPrimeOrganizationContractAddress.toLowerCase()) {
      logger.error('OSTPrime organization contract address is invalid.');
    }

    logger.log('* Validating OSTPrime token address.');
    let chainStPrimeTokenAddress = await stPrimeContractObj.methods.token().call({});

    let dbStPrimeTokenAddress = oThis.stContractAddress;

    if (dbStPrimeTokenAddress.toLowerCase() !== chainStPrimeTokenAddress.toLowerCase()) {
      logger.error('OSTPrime token address is invalid.');
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

  /**
   * Validate given organization deployment
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
      case chainAddressConstants.stPrimeOrgContractKind:
        dbOrganizationContractAddress = oThis.stPrimeOrgContractAddress;
        dbAdminAddress = oThis.stPrimeOrgContractAdminAddress;
        dbAOwnerAddress = oThis.stPrimeOrgContractOwnerAddress;
        dbWorkerAddressesMap = oThis.stPrimeOrgContractWorkerAddresses;
        break;
      case chainAddressConstants.auxAnchorOrgContractKind:
        dbOrganizationContractAddress = oThis.auxAnchorOrgContractAddress;
        dbAdminAddress = oThis.auxAnchorOrgContractAdminAddress;
        dbAOwnerAddress = oThis.auxAnchorOrgContractOwnerAddress;
        dbWorkerAddressesMap = oThis.auxAnchorOrgContractWorkerAddresses;
        break;
      default:
        console.error('unhandled organizationKind found: ', organizationKind);
        Promise.reject();
        break;
    }

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
      'Organization',
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
    for (let i = 0; i < dbWorkerAddressesMap.length; i++) {
      let isWorkerResult = await organizationContractObj.methods.isWorker(dbWorkerAddressesMap[i].address).call({});
      if (!isWorkerResult) {
        logger.error('Deployment verification of', organizationKind, 'failed.');
        Promise.reject();
      }
    }
  }

  /**
   * Validate given anchor contract deployment
   *
   * @param anchorKind
   * @return {Promise<Promise<never> | Promise<any>>}
   * @private
   */
  async _validateAnchor(anchorKind) {
    const oThis = this;

    let verifierHelperObj = null,
      remoteChainId = null,
      coAnchorAddress = null,
      remoteWeb3Instance = null;

    if (anchorKind === chainAddressConstants.originAnchorContractKind) {
      verifierHelperObj = new VerifiersHelper(oThis.originWeb3Instance);
      remoteChainId = parseInt(oThis.auxChainId);
      coAnchorAddress = oThis.auxAnchorContractAddress;
      remoteWeb3Instance = oThis.auxWeb3Instance;
    } else {
      verifierHelperObj = new VerifiersHelper(oThis.auxWeb3Instance);
      remoteChainId = parseInt(oThis.originChainId);
      coAnchorAddress = oThis.originAnchorContractAddress;
      remoteWeb3Instance = oThis.originWeb3Instance;
    }

    let dbAnchorOrganizationAddress = null,
      dbAnchorContractAddress = null;

    logger.log('* Fetching', anchorKind, ' related contract addresses from database.');
    switch (anchorKind) {
      case chainAddressConstants.originAnchorContractKind:
        dbAnchorOrganizationAddress = oThis.originAnchorOrgContractAddress;
        dbAnchorContractAddress = oThis.originAnchorContractAddress;
        break;
      case chainAddressConstants.auxAnchorContractKind:
        dbAnchorOrganizationAddress = oThis.auxAnchorOrgContractAddress;
        dbAnchorContractAddress = oThis.auxAnchorContractAddress;
        break;
      default:
        console.error('unhandled anchorKind found: ', anchorKind);
        Promise.reject();
        break;
    }

    logger.log('* Validating the deployed code on the', anchorKind, 'address.');
    let rsp = await verifierHelperObj.validateContract(
      dbAnchorContractAddress,
      verifierHelperObj.getAnchorContractName
    );
    if (!rsp) {
      logger.error('Deployment verification of', anchorKind, 'organization contract failed.');
      return Promise.reject();
    }

    let anchorContractObj = await verifierHelperObj.getContractObj('Anchor', dbAnchorContractAddress);

    logger.log('* Validating the anchor organization address.');
    let chainOrganizationAddress = await anchorContractObj.methods.organization().call({});
    if (chainOrganizationAddress.toLowerCase() !== dbAnchorOrganizationAddress.toLowerCase()) {
      logger.error('Deployment verification of anchor organization failed.');
      Promise.reject();
    }

    logger.log('* Validating the co-anchor address.');
    let chainCoAnchor = await anchorContractObj.methods.coAnchor().call({});
    if (coAnchorAddress.toLowerCase() !== chainCoAnchor.toLowerCase()) {
      logger.error('Deployment verification co-anchor address failed.');
      Promise.reject();
    }

    logger.log('* Validating the remote chain id.');
    let chainRemoteChainId = await anchorContractObj.methods.getRemoteChainId().call({});
    if (parseInt(chainRemoteChainId) !== remoteChainId) {
      logger.error('Deployment verification of RemoteChainId parameter failed.');
      Promise.reject();
    }

    let contractLatestStateRootBlockHeight = await anchorContractObj.methods.getLatestStateRootBlockHeight().call({});
    let committedStateRoot = await anchorContractObj.methods.getStateRoot(contractLatestStateRootBlockHeight).call({});

    let remoteChainBlock = await remoteWeb3Instance.eth.getBlock(contractLatestStateRootBlockHeight);
    if (remoteChainBlock.stateRoot !== committedStateRoot) {
      logger.error('Committed state root mis-match found for', anchorKind);
      Promise.reject();
    }
  }

  /**
   * Validate specific Aux library contract deployement
   *
   * @param libKind
   * @return {Promise<Promise<never> | Promise<any>>}
   * @private
   */
  async _validateLib(libKind) {
    const oThis = this;

    logger.info('** Library:', libKind);
    logger.log('* Fetching', libKind, 'contract address from database.');
    let dbLibAddress = null;

    switch (libKind) {
      case chainAddressConstants.auxMppLibContractKind:
        dbLibAddress = oThis.auxMppLibContractAddress;
        break;
      case chainAddressConstants.auxMbLibContractKind:
        dbLibAddress = oThis.auxMbLibContractAddress;
        break;
      case chainAddressConstants.auxGatewayLibContractKind:
        dbLibAddress = oThis.auxGatewayLibContractAddress;
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

  /**
   * Validate gateway and co-gateway contract deployments
   *
   * @return {Promise<Promise<never> | Promise<any>>}
   * @private
   */
  async _validateGatewayAndCoGateway() {
    const oThis = this;

    logger.log('* Fetching Gateway contract address for this chain from database.');
    let dbGatewayContractAddress = oThis.originGatewayContractAddress;

    logger.log('* Fetching Co-Gateway contract address for this chain from database.');
    let dbCoGatewayContractAddress = oThis.auxCoGatewayContractAddress;

    logger.log('* Fetching SimpleStake contract address for this chain from database.');
    let dbSimpleStakeContractAddress = oThis.stSimpleStakeContractAddress;

    logger.log('* Fetching Simple token contract address for this chain from database.');
    let simpleTokenContractAddress = oThis.stContractAddress;

    logger.step('** Validating Gateway contract.');
    logger.log('* Validating the deployed code for Gateway address.');
    let rsp = await oThis.verifiersHelper.validateContract(
      dbGatewayContractAddress,
      oThis.verifiersHelper.gatewayContractName
    );
    if (!rsp) {
      logger.error('Deployment verification of gateway contract failed.');
      return Promise.reject();
    }

    let verifierHelperObj = new VerifiersHelper(oThis.originWeb3Instance);
    let gatewayContract = await verifierHelperObj.getContractObj(
      verifierHelperObj.gatewayContractName,
      dbGatewayContractAddress
    );

    let dbOrganizationContractAddress = oThis.stOrgContractAddress;

    logger.log('* Validating the Gateway contract address.');
    let chainGatewayContractAddress = await gatewayContract.methods.organization().call({});
    if (dbOrganizationContractAddress.toLowerCase() !== chainGatewayContractAddress.toLowerCase()) {
      logger.error('Deployment verification Gateway contract address failed.');
      Promise.reject();
    }

    let dbOriginAnchorContractAddress = oThis.originAnchorContractAddress;

    logger.log('* Validating the state root provider address.');
    let gatewayStateRootProviderAddress = await gatewayContract.methods.stateRootProvider().call({});
    if (dbOriginAnchorContractAddress.toLowerCase() !== gatewayStateRootProviderAddress.toLowerCase()) {
      logger.error('Deployment verification Gateway contract address failed.');
      Promise.reject();
    }

    logger.log('* Validating the Simple Stake contract address.');
    let chainStakeVaultAddress = await gatewayContract.methods.stakeVault().call({});
    if (dbSimpleStakeContractAddress.toLowerCase() !== chainStakeVaultAddress.toLowerCase()) {
      logger.error('Deployment verification Simple Stake contract address failed.');
      Promise.reject();
    }

    logger.log('* Validating if Gateway is activated or not.');
    let gatewayActivated = await gatewayContract.methods.activated().call({});
    if (!gatewayActivated) {
      logger.error('Deployment verification of Gateway Activation failed.');
      Promise.reject();
    }

    logger.log('* Validating token address in Gateway *');
    let token = await gatewayContract.methods.token().call({});

    if (token.toLowerCase() != simpleTokenContractAddress.toLowerCase()) {
      logger.error('Token is not set to simple token');
      Promise.reject();
    }

    logger.log('* Validating base token address in Gateway *');
    let baseToken = await gatewayContract.methods.baseToken().call({});

    if (baseToken.toLowerCase() != simpleTokenContractAddress.toLowerCase()) {
      logger.error('Base token is not set to simple token');
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

    let dbValueTokenAddress = oThis.stContractAddress;

    logger.log('* Validating value token address.');
    let chainValueToken = await coGatewayContract.methods.valueToken().call({});

    if (dbValueTokenAddress.toLowerCase() !== chainValueToken.toLowerCase()) {
      logger.error('Verification check for value token address failed.');
      Promise.reject();
    }

    let dbUtilityTokenAddress = oThis.stPrimeContractAddress;

    logger.log('* Validating utility token address.');
    let chainUtilityToken = await coGatewayContract.methods.utilityToken().call({});

    if (dbUtilityTokenAddress.toLowerCase() !== chainUtilityToken.toLowerCase()) {
      logger.error('Verification check for utility token address failed.');
      Promise.reject();
    }

    let dbCoGatewayStateRootProvider = oThis.auxAnchorContractAddress;

    logger.log('* Validating the state root provider gateway contract address.');
    let chainCoGatewayStateRootProvider = await coGatewayContract.methods.stateRootProvider().call({});

    if (dbCoGatewayStateRootProvider.toLowerCase() !== chainCoGatewayStateRootProvider.toLowerCase()) {
      logger.error('Verification check co-gateway state root provider failed.');
      Promise.reject();
    }

    let dbCoGatewayOrganizationAddress = oThis.stPrimeOrgContractAddress;

    logger.log('* Validating the state root provider gateway contract address.');
    let chainCoGatewayOrganizationAddress = await coGatewayContract.methods.organization().call({});

    if (dbCoGatewayOrganizationAddress.toLowerCase() !== chainCoGatewayOrganizationAddress.toLowerCase()) {
      logger.error('Verification check co-gateway state root provider failed.');
      Promise.reject();
    }
  }

  async _validatePriceOracleContract(baseCurrency) {
    const oThis = this;

    logger.info('** Base currency:', baseCurrency);
    logger.log('* Fetching priceOracleContractAddress for', baseCurrency, ' from database.');

    let allStakeCurrencyDetails = oThis.allStakeCurrencyDetails,
      priceOracleContractAddress;

    // Fetch quote currencies
    let allQuoteCurrencySymbols = new AllQuoteCurrencySymbols({});

    let cacheRsp = await allQuoteCurrencySymbols.fetch();
    let quoteCurrencies = cacheRsp.data;

    let quoteCurrencyBySymbolCache = new QuoteCurrencyBySymbolCache({
      quoteCurrencySymbols: quoteCurrencies
    });

    let quoteCurrencyCacheRsp = await quoteCurrencyBySymbolCache.fetch();

    let quoteCurrencyData = quoteCurrencyCacheRsp.data;

    for (let quoteCurrency in quoteCurrencyData) {
      let quoteCurrencyId = quoteCurrencyData[quoteCurrency].id,
        stakeCurrencyId = oThis.allStakeCurrencyDetails[baseCurrency].id;

      oThis.priceOracleContract = await oThis._verifyPriceOracleContract(stakeCurrencyId, quoteCurrencyId);

      await oThis._validatePriceOracleAdmin();

      await oThis._validatePriceOracleOwner();

      await oThis._validatePriceOracleWorker();

      await oThis._validateBaseCurrency(baseCurrency);

      await oThis._validateQuoteCurrency(quoteCurrency);
    }
  }

  /**
   * Verify price oracle contract
   *
   * @param stakeCurrencyId
   * @param quoteCurrencyId
   * @return {Promise<*>}
   * @private
   */
  async _verifyPriceOracleContract(stakeCurrencyId, quoteCurrencyId) {
    const oThis = this;

    let auxPriceOracleModel = new AuxPriceOracleModel({});

    let priceOracleRsp = await auxPriceOracleModel.fetchPriceOracleDetails({
      chainId: oThis.chainId,
      stakeCurrencyId: stakeCurrencyId,
      quoteCurrencyId: quoteCurrencyId
    });

    let priceOracleContractAddress = priceOracleRsp.data['contractAddress'];

    let rsp = await oThis.verifiersHelper.validateContract(
      priceOracleContractAddress,
      contractNameConstants.PriceOracleContractName
    );

    if (!rsp) {
      logger.error('Deployment verification of price oracle contract failed.');
      return Promise.reject();
    }

    const verifierHelperObj = new VerifiersHelper(oThis.auxWeb3Instance);
    let priceOracleContract = await verifierHelperObj.getContractObj(
      contractNameConstants.PriceOracleContractName,
      priceOracleContractAddress
    );

    return priceOracleContract;
  }

  /**
   * Validate price oracle admin
   *
   * @return {Promise<void>}
   * @private
   */
  async _validatePriceOracleAdmin() {
    const oThis = this;

    logger.log('* Validating the contract admin address.');
    let adminAddress = await oThis.priceOracleContract.methods.adminAddress().call({});

    if (oThis.auxPriceOracleContractAdminKind.toLowerCase() !== adminAddress.toLowerCase()) {
      logger.error('Verification check for admin address failed.');
      Promise.reject();
    }
  }

  /**
   * Validate price oracle owner
   *
   * @return {Promise<void>}
   * @private
   */
  async _validatePriceOracleOwner() {
    const oThis = this;

    logger.log('* Validating the contract owner address.');
    let ownerAddress = await oThis.priceOracleContract.methods.owner().call({});

    if (oThis.auxPriceOracleContractOwnerKind.toLowerCase() !== ownerAddress.toLowerCase()) {
      logger.error('Verification check for owner address failed.');
      Promise.reject();
    }
  }

  /**
   * Validate price oracle worker
   *
   * @return {Promise<void>}
   * @private
   */
  async _validatePriceOracleWorker() {
    const oThis = this;

    logger.log('* Validating the contract worker address.');
    let workerAddress = await oThis.priceOracleContract.methods.opsAddress().call({});

    if (oThis.auxPriceOracleContractWorkerKind.toLowerCase() !== workerAddress.toLowerCase()) {
      logger.error('Verification check for worker address failed.');
      Promise.reject();
    }
  }

  /**
   * Validate base currency in price oracle
   *
   * @param baseCurrency
   * @return {Promise<void>}
   * @private
   */
  async _validateBaseCurrency(baseCurrency) {
    const oThis = this;

    logger.log('* Validating the contract base currency.');
    let baseCurrencyFromContractInHex = await oThis.priceOracleContract.methods.baseCurrency().call({});

    let baseCurrencyCodeFromDb = allStakeCurrencyDetails[baseCurrency].constants.baseCurrencyCode;

    let baseCurrencyFromContract = basicHelper.convertHexToString(baseCurrencyFromContractInHex.substr(2));

    if (baseCurrencyCodeFromDb != baseCurrencyFromContract) {
      logger.error('Verification check for base currency failed.');
      logger.error(`====baseCurrencyCodeFromDb:--${baseCurrencyCodeFromDb}--`);
      logger.error(`====baseCurrencyFromContract:--${baseCurrencyFromContract}--`);
      Promise.reject();
    }
  }

  /**
   * Validate quote currency in price oracle
   *
   * @param quoteCurrency
   * @return {Promise<void>}
   * @private
   */
  async _validateQuoteCurrency(quoteCurrency) {
    const oThis = this;

    logger.log('* Validating the contract quote currency.');
    let quoteCurrencyHex = await oThis.priceOracleContract.methods.quoteCurrency().call({}),
      quoteCurrencyFromContract = basicHelper.convertHexToString(quoteCurrencyHex.substr(2));

    if (quoteCurrency !== quoteCurrencyFromContract) {
      logger.error('Verification check for quote currency failed.');
      logger.error(`====quoteCurrencyFromContract:--${quoteCurrencyFromContract}--`);
      Promise.reject();
    }
  }
}

new AuxChainSetup({ auxChainId: program.auxChainId })
  .validate()
  .then()
  .catch();
