/**
 * Module to setup USDC stable token.
 *
 * @module lib/setup/originChain/SetupUsdcToken
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  TransferEthUsingPK = require(rootPrefix + '/lib/fund/eth/TransferUsingPK'),
  GeneratePrivateKey = require(rootPrefix + '/tools/helpers/GeneratePrivateKey'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  fundingConfig = require(rootPrefix + '/config/funding'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  environmentInfoConstants = require(rootPrefix + '/lib/globalConstant/environmentInfo');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/tools/chainSetup/origin/usdcToken/Deploy');
require(rootPrefix + '/tools/chainSetup/origin/usdcToken/Initialize');
require(rootPrefix + '/tools/chainSetup/origin/usdcToken/ConfigureMinter');
require(rootPrefix + '/tools/chainSetup/origin/usdcToken/Mint');

/**
 * Class to setup USDC stable token.
 *
 * @class SetupUsdcToken
 */
class SetupUsdcToken {
  /**
   * Constructor to setup USDC stable token.
   *
   * @param {number/string} originChainId
   * @param {string} ethOwnerPrivateKey
   *
   * @constructor
   */
  constructor(originChainId, ethOwnerPrivateKey) {
    const oThis = this;

    oThis.chainId = originChainId;
    oThis.ethOwnerPrivateKey = ethOwnerPrivateKey;

    oThis.sleepTime = coreConstants.environment === environmentInfoConstants.environment.development ? 5000 : 60000;

    // Declare contract constants.
    oThis.contractName = 'USDC';
    oThis.contractSymbol = 'USDC';
    oThis.contractCurrency = 'USD';
    oThis.contractDecimals = 6;
  }

  /**
   * Perform.
   *
   * @return {Promise<result>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      }
      logger.error('lib/setup/originChain/SetupUsdcToken.js::perform::catch');
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 'l_s_oc_sut_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    });
  }

  /**
   * Async perform.
   *
   * @return {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    logger.step('** Generate USDC owner key.');
    const usdcTokenOwnerDetails = await oThis._generateAddrAndPrivateKey();
    const usdcTokenOwnerAddress = usdcTokenOwnerDetails.address,
      usdcTokenOwnerPrivateKey = usdcTokenOwnerDetails.privateKey;

    const originMaxGasPriceMultiplierWithBuffer = basicHelper.getOriginMaxGasPriceMultiplierWithBuffer(),
      amountToFundOriginGasMap = fundingConfig[chainAddressConstants.masterInternalFunderKind].originGas,
      amountForUsdcOwnerAddressForOneGwei =
        amountToFundOriginGasMap[chainAddressConstants.usdcContractOwnerKind].fundAmount,
      amountForUsdcOwnerAddress = basicHelper
        .convertToWei(String(amountForUsdcOwnerAddressForOneGwei))
        .mul(basicHelper.convertToBigNumber(originMaxGasPriceMultiplierWithBuffer));

    await oThis.getIc();

    logger.step('* Funding USDC owner address with ETH.');
    await oThis._fundAddressWithEth(usdcTokenOwnerAddress, amountForUsdcOwnerAddress);
    await basicHelper.sleep(oThis.sleepTime);

    // Deploying contract now.
    logger.step('** Deploying USDC Contract.');
    const usdcContractAddress = await oThis.deployUsdcToken(usdcTokenOwnerAddress, usdcTokenOwnerPrivateKey);
    await basicHelper.sleep(oThis.sleepTime);

    // Initializing contract now.
    logger.step('** Initializing USDC Contract.');
    await oThis.initializeUsdcToken(usdcTokenOwnerAddress, usdcTokenOwnerPrivateKey, usdcContractAddress);
    await basicHelper.sleep(oThis.sleepTime);

    // Configuring minter now.
    logger.step('** Configuring minter for USDC Contract.');
    await oThis.configureMinterForUsdcToken(usdcTokenOwnerAddress, usdcTokenOwnerPrivateKey, usdcContractAddress);
    await basicHelper.sleep(oThis.sleepTime);

    // Minting USDC tokens now.
    logger.step('** Minting USDC Token.');
    await oThis.mintUsdcToken(usdcTokenOwnerAddress, usdcTokenOwnerPrivateKey, usdcContractAddress);
    await basicHelper.sleep(oThis.sleepTime);

    return responseHelper.successWithData({
      usdcTokenOwnerAddress: usdcTokenOwnerAddress,
      usdcTokenOwnerPrivateKey: usdcTokenOwnerPrivateKey,
      usdcContractAddress: usdcContractAddress
    });
  }

  /**
   * Generate new address.
   *
   * @returns {*}
   * @private
   */
  _generateAddrAndPrivateKey() {
    const generatePrivateKey = new GeneratePrivateKey();
    const generatePrivateKeyRsp = generatePrivateKey.perform();

    logger.log('Generated Address: ', generatePrivateKeyRsp.data);

    return generatePrivateKeyRsp.data;
  }

  /**
   * Create an instance of instance composer.
   *
   * @sets oThis.ic
   *
   * @return {Promise<void>}
   */
  async getIc() {
    const oThis = this;

    const configStrategyHelper = new ConfigStrategyHelper(0, 0),
      configRsp = await configStrategyHelper.getComplete();

    oThis.ic = new InstanceComposer(configRsp.data);
  }

  /**
   * Fund address with ETH.
   *
   * @param {string} address: address to fund ETH to
   * @param {BigNumber} amount
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fundAddressWithEth(address, amount) {
    const oThis = this;

    const providers = await oThis._getProvidersFromConfig(),
      provider = providers[0], // Select one provider from provider endpoints array.
      amountInWei = amount.toString(10);

    await new TransferEthUsingPK({
      toAddress: address,
      fromAddressPrivateKey: oThis.ethOwnerPrivateKey,
      amountInWei: amountInWei,
      originChainId: oThis.chainId,
      provider: provider
    }).perform();
  }

  /**
   * Get providers from config.
   *
   * @return {Promise<any>}
   * @private
   */
  async _getProvidersFromConfig() {
    const csHelper = new ConfigStrategyHelper(0),
      csResponse = await csHelper.getForKind(configStrategyConstants.originGeth),
      configForChain = csResponse.data[configStrategyConstants.originGeth],
      readWriteConfig = configForChain[configStrategyConstants.gethReadWrite];

    return readWriteConfig.wsProvider ? readWriteConfig.wsProviders : readWriteConfig.rpcProviders;
  }

  /**
   * Deploy USDC contract.
   *
   * @param {string} usdcTokenOwnerAddress
   * @param {string} usdcTokenOwnerPrivateKey
   *
   * @returns {Promise<*>}
   */
  async deployUsdcToken(usdcTokenOwnerAddress, usdcTokenOwnerPrivateKey) {
    const oThis = this;

    const DeployUsdcToken = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeployUsdcToken'),
      deployUsdcToken = new DeployUsdcToken({
        signerAddress: usdcTokenOwnerAddress,
        signerKey: usdcTokenOwnerPrivateKey
      });

    const deploySimpleTokenRsp = await deployUsdcToken.perform();

    if (deploySimpleTokenRsp.isSuccess()) {
      return Promise.resolve(deploySimpleTokenRsp.data.contractAddress);
    }
    logger.error('USDC token deployment failed.');

    return Promise.reject(new Error('USDC token deployment failed.'));
  }

  /**
   * Initialize USDC contract.
   *
   * @param {string} usdcTokenOwnerAddress
   * @param {string} usdcTokenOwnerPrivateKey
   * @param {string} usdcContractAddress
   *
   * @returns {Promise<*>}
   */
  async initializeUsdcToken(usdcTokenOwnerAddress, usdcTokenOwnerPrivateKey, usdcContractAddress) {
    const oThis = this;

    const InitializeUsdcToken = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'InitializeUsdcToken'),
      initializeUsdcToken = new InitializeUsdcToken({
        signerAddress: usdcTokenOwnerAddress,
        signerKey: usdcTokenOwnerPrivateKey,
        usdcContractAddress: usdcContractAddress,
        contractName: oThis.contractName,
        contractSymbol: oThis.contractSymbol,
        contractCurrency: oThis.contractCurrency,
        contractDecimals: oThis.contractDecimals
      });

    const initializeUsdcTokenRsp = await initializeUsdcToken.perform();

    if (initializeUsdcTokenRsp.isSuccess()) {
      return;
    }
    logger.error('USDC token initialization failed.');

    return Promise.reject(new Error('USDC token initialization failed.'));
  }

  /**
   * Configure minter for USDC contract.
   *
   * @param {string} usdcTokenOwnerAddress
   * @param {string} usdcTokenOwnerPrivateKey
   * @param {string} usdcContractAddress
   *
   * @returns {Promise<*>}
   */
  async configureMinterForUsdcToken(usdcTokenOwnerAddress, usdcTokenOwnerPrivateKey, usdcContractAddress) {
    const oThis = this;

    const ConfigureMinterForUsdcToken = oThis.ic.getShadowedClassFor(
        coreConstants.icNameSpace,
        'ConfigureMinterForUsdcToken'
      ),
      configureMinterForUsdcToken = new ConfigureMinterForUsdcToken({
        signerAddress: usdcTokenOwnerAddress,
        signerKey: usdcTokenOwnerPrivateKey,
        usdcContractAddress: usdcContractAddress
      });

    const configureMinterForUsdcTokenRsp = await configureMinterForUsdcToken.perform();

    if (configureMinterForUsdcTokenRsp.isSuccess()) {
      return;
    }
    logger.error('Configuring minter for USDC token failed.');

    return Promise.reject(new Error('Configuring minter for USDC token failed.'));
  }

  /**
   * Mint USDC tokens.
   *
   * @param {string} usdcTokenOwnerAddress
   * @param {string} usdcTokenOwnerPrivateKey
   * @param {string} usdcContractAddress
   *
   * @returns {Promise<*>}
   */
  async mintUsdcToken(usdcTokenOwnerAddress, usdcTokenOwnerPrivateKey, usdcContractAddress) {
    const oThis = this;

    const MintUsdcToken = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'MintUsdcToken'),
      mintUsdcToken = new MintUsdcToken({
        signerAddress: usdcTokenOwnerAddress,
        signerKey: usdcTokenOwnerPrivateKey,
        usdcContractAddress: usdcContractAddress
      });

    const mintUsdcTokenRsp = await mintUsdcToken.perform();

    if (mintUsdcTokenRsp.isSuccess()) {
      return;
    }
    logger.error('USDC token minting failed.');

    return Promise.reject(new Error('USDC token minting failed.'));
  }
}

module.exports = SetupUsdcToken;
