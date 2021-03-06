'use strict';

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  DeployPriceOracle = require(rootPrefix + '/tools/chainSetup/aux/DeployPriceOracle'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  StakeCurrencyModel = require(rootPrefix + '/app/models/mysql/StakeCurrency'),
  quoteCurrencyConstants = require(rootPrefix + '/lib/globalConstant/quoteCurrency'),
  QuoteCurrencyModel = require(rootPrefix + '/app/models/mysql/QuoteCurrency'),
  StakeCurrencyBySymbolCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyBySymbol'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  stakeCurrencyConstants = require(rootPrefix + '/lib/globalConstant/stakeCurrency');

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
  /**
   *
   * @param originChainId
   * @param auxChainId
   *
   * @constructor
   */
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

  /**
   * async perform
   *
   * @returns {Promise<boolean>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis._getIc();

    logger.step('** Deploying organization for simple token prime.');
    await oThis.setupAuxOrganization(chainAddressConstants.stPrimeOrgContractKind);
    await basicHelper.sleep(oThis.sleepInterval);

    logger.step('** Deploying organization for aux anchor.');
    await oThis.setupAuxOrganization(chainAddressConstants.auxAnchorOrgContractKind);
    await basicHelper.sleep(oThis.sleepInterval);

    logger.step('** Deploying STPrime');
    await oThis.deploySTPrime();
    await basicHelper.sleep(oThis.sleepInterval);

    logger.step('** Initialize STPrime Contract');
    await oThis.initializeSTPrime();
    await basicHelper.sleep(oThis.sleepInterval);

    logger.step('** Deploying origin anchor contract.');
    await oThis.deployOriginAnchor();
    await basicHelper.sleep(oThis.sleepInterval);

    logger.step('** Deploying auxiliary anchor contract.');
    await oThis.deployAuxAnchor();
    await basicHelper.sleep(oThis.sleepInterval);

    logger.step('** Set Co anchor in origin anchor');
    await oThis.setCoAnchor(coreConstants.originChainKind);
    await basicHelper.sleep(oThis.sleepInterval);

    logger.step('** Set Co anchor in aux anchor');
    await oThis.setCoAnchor(coreConstants.auxChainKind);
    await basicHelper.sleep(oThis.sleepInterval);

    logger.step('** Deploy libraries.');

    logger.log('* [Auxiliary]: Deploy MerklePatriciaProof');
    await oThis.deployLib(coreConstants.auxChainKind, 'merklePatriciaProof');
    await basicHelper.sleep(oThis.sleepInterval);

    logger.log('* [Auxiliary]: Deploy MessageBus');
    await oThis.deployLib(coreConstants.auxChainKind, 'messageBus');
    await basicHelper.sleep(oThis.sleepInterval);

    logger.log('* [Auxiliary]: Deploy GatewayLib');
    await oThis.deployLib(coreConstants.auxChainKind, 'gateway');
    await basicHelper.sleep(oThis.sleepInterval);

    logger.step('** Deploying gateway contract');
    await oThis.deployGatewayContract();
    await basicHelper.sleep(oThis.sleepInterval);

    logger.step('** Deploying co-gateway contract');
    await oThis.deployCoGatewayContract();
    await basicHelper.sleep(oThis.sleepInterval);

    logger.step('** Activate co-gateway in gateway contract');
    await oThis.activateGatewayContract();
    await basicHelper.sleep(oThis.sleepInterval);

    logger.step('** Setting co-gateway address to STPrime contract.');
    await oThis.setCoGatewayInSTPrime();
    await basicHelper.sleep(oThis.sleepInterval);

    logger.step('** Deploy Price Oracle, Set Ops Address, Set Admin Address for all the base currencies');
    await oThis.deployPriceOracles();

    logger.step('** Creating ST Prime economy.');
    await oThis.createEconomy();

    return true;
  }

  /**
   * Get IC
   *
   * @returns {Promise<void>}
   * @private
   */
  async _getIc() {
    logger.step('** Getting config strategy for aux chain.');
    const oThis = this,
      rsp = await chainConfigProvider.getFor([oThis.auxChainId]),
      config = rsp[oThis.auxChainId];

    oThis.chainEndpoint = config[configStrategyConstants.auxGeth][configStrategyConstants.gethReadOnly].wsProvider;

    oThis.blockTimestamp = parseInt((new Date().getTime() / 1000).toFixed(0));

    oThis.ic = new InstanceComposer(config);
  }

  /**
   * deploy Aux Organization
   * @param addressKind
   * @returns {Promise<result>|*|Promise}
   */
  setupAuxOrganization(addressKind) {
    const oThis = this,
      SetupOrganization = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'SetupOrganization');

    return new SetupOrganization({
      chainKind: coreConstants.auxChainKind,
      addressKind: addressKind
    }).perform();
  }

  /**
   * Deploy Simple Token Prime
   * @returns {Promise<result>}
   */
  deploySTPrime() {
    const oThis = this,
      DeploySimpleTokenPrime = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeploySimpleTokenPrime');
    return new DeploySimpleTokenPrime({ chainId: oThis.auxChainId }).perform();
  }

  /**
   * Initialize Simple Token Prime
   * @returns {Promise<result>}
   */
  initializeSTPrime() {
    const oThis = this,
      InitializeSimpleTokenPrime = oThis.ic.getShadowedClassFor(
        coreConstants.icNameSpace,
        'InitializeSimpleTokenPrime'
      );

    return new InitializeSimpleTokenPrime({ chainId: oThis.auxChainId }).perform();
  }

  /**
   * Deploy Origin Anchor
   *
   * @returns {Promise<Promise<result>|*|Promise>}
   */
  async deployOriginAnchor() {
    const oThis = this,
      DeployAnchor = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeployAnchor');

    return new DeployAnchor({
      chainKind: coreConstants.originChainKind,
      auxChainId: oThis.auxChainId
    }).perform();
  }

  /**
   * Deploy Aux Anchor
   *
   * @returns {Promise<result>|*|Promise}
   */
  deployAuxAnchor() {
    const oThis = this,
      DeployAnchor = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeployAnchor');

    return new DeployAnchor({
      chainKind: coreConstants.auxChainKind,
      auxChainId: oThis.auxChainId
    }).perform();
  }

  /**
   * Set co anchor in anchor contract
   * @param chainKind
   * @returns {Promise<result>|*|Promise}
   */
  setCoAnchor(chainKind) {
    const oThis = this,
      SetCoAnchor = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'SetCoAnchor');
    return new SetCoAnchor({ chainKind: chainKind, auxChainId: oThis.auxChainId }).perform();
  }

  /**
   * Deploy libs
   *
   * @param chainKind
   * @param libKind
   *
   * @returns {*}
   */
  deployLib(chainKind, libKind) {
    const oThis = this,
      DeployLib = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeployLib');

    return new DeployLib({
      chainKind: chainKind,
      libKind: libKind
    }).perform();
  }

  /**
   * Deploy gateway contract
   * @returns {Promise<Promise<result>|*|Promise>}
   */
  async deployGatewayContract() {
    // Deployment of gateway contract is done on origin chain.
    const oThis = this,
      rsp = await chainConfigProvider.getFor([oThis.originChainId]),
      config = rsp[oThis.originChainId],
      ic = new InstanceComposer(config),
      DeployGateway = ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeployGateway');
    return new DeployGateway({ auxChainId: oThis.auxChainId }).perform();
  }

  /**
   * Deploy Co Gateway contract
   * @returns {Promise<result>|*|Promise}
   */
  deployCoGatewayContract() {
    const oThis = this,
      DeployCoGateway = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeployCoGateway');
    return new DeployCoGateway({ auxChainId: oThis.auxChainId }).perform();
  }

  /**
   * Activate gateway contract
   *
   * @returns {Promise<result>|*|Promise}
   */
  activateGatewayContract() {
    const oThis = this,
      ActivateGateway = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'ActivateGateway');
    return new ActivateGateway({ auxChainId: oThis.auxChainId }).perform();
  }

  /**
   * Set Co gateway in ST Prime contract
   * @returns {*}
   */
  setCoGatewayInSTPrime() {
    const oThis = this,
      SetCoGatewayInOSTPrime = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'SetCoGatewayInOSTPrime');
    return new SetCoGatewayInOSTPrime({ auxChainId: oThis.auxChainId }).perform();
  }

  /**
   * Deploy price oracle contracts
   *
   * @returns {Promise<void>}
   */
  async deployPriceOracles() {
    const oThis = this;

    let stakeCurrenciesDetails = await new StakeCurrencyModel()
      .select('symbol')
      .where({ status: stakeCurrencyConstants.invertedStatuses[stakeCurrencyConstants.setupInProgressStatus] })
      .fire();

    let quoteCurrenciesDetails = await new QuoteCurrencyModel()
      .select('symbol')
      .where({ status: quoteCurrencyConstants.invertedStatuses[quoteCurrencyConstants.activeStatus] })
      .fire();

    for (let i = 0; i < stakeCurrenciesDetails.length; i++) {
      let baseCurrency = stakeCurrenciesDetails[i].symbol;

      for (let j = 0; j < quoteCurrenciesDetails.length; j++) {
        let quoteCurrency = quoteCurrenciesDetails[j].symbol;

        logger.step('* Deploying price oracle for base currency:', baseCurrency, ' quote currency:', quoteCurrency);

        await new DeployPriceOracle({
          auxChainId: oThis.auxChainId,
          baseCurrencySymbol: baseCurrency,
          quoteCurrencySymbol: quoteCurrency
        }).perform();

        await basicHelper.sleep(oThis.sleepInterval);
      }
    }
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

    let economyParams = {
      chainId: oThis.auxChainId,
      decimals: '18', // contract decimals, if not provided, defaults to 18
      contractAddress: oThis.kindToAddressMap['contractAddress'], // ST Prime contract address
      displayName: 'OST Prime', // economy name,
      conversionFactor: '1', // conversion factor
      symbol: 'OST' // economy display symbol
    };

    // Always sanitize extra storage params outside the call
    let extraStorageParams = {
      gatewayContractAddress: oThis.kindToAddressMap['gatewayContractAddress'].toLowerCase(), // gateway contract address
      originContractAddress: oThis.kindToAddressMap['originContractAddress'].toLowerCase(), // value branded token address (for STPrime, it will be ST contract address)
      baseCurrencyContractAddress: oThis.kindToAddressMap['originContractAddress'].toLowerCase()
    };

    let createEconomyObject = new CreateEconomyKlass(
      economyParams,
      extraStorageParams,
      oThis.blockTimestamp, // timestamp for ST Prime deployment, i.e. current time-stamp
      oThis.chainEndpoint
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

    // Fetch OST contract address.
    let stakeCurrencyDetails = await new StakeCurrencyBySymbolCache({
      stakeCurrencySymbols: [stakeCurrencyConstants.OST]
    }).fetch();

    if (stakeCurrencyDetails.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_ac_c_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.kindToAddressMap['originContractAddress'] =
      stakeCurrencyDetails.data[stakeCurrencyConstants.OST].contractAddress;

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

    oThis.kindToAddressMap['gatewayContractAddress'] =
      auxChainAddressesRsp.data[chainAddressConstants.originGatewayContractKind].address;
  }

  /**
   * Fetch config strategy
   *
   * @returns {*}
   */
  get configStrategy() {
    const oThis = this;
    return oThis.ic.configStrategy;
  }

  /**
   * Fetch aux geth config
   *
   * @returns {string}
   */
  get auxGethConfig() {
    const oThis = this;
    return oThis.configStrategy.auxGeth;
  }

  /**
   * Calculate sleep time
   *
   * @returns {number}
   */
  get sleepInterval() {
    const oThis = this;
    return (oThis.auxGethConfig.blockGenerationTime * oThis.auxGethConfig.finalizeAfterBlocks + 5) * 1000;
  }
}

module.exports = AuxContractsSetup;
