/**
 * Module to setup simple token.
 *
 * @module lib/setup/originChain/SetupSimpleToken
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  TransferEthUsingPK = require(rootPrefix + '/lib/fund/eth/TransferUsingPK'),
  GeneratePrivateKey = require(rootPrefix + '/tools/helpers/GeneratePrivateKey'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  GenerateChainKnownAddresses = require(rootPrefix + '/tools/helpers/GenerateChainKnownAddresses'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  fundingConfig = require(rootPrefix + '/config/funding'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  environmentInfoConstants = require(rootPrefix + '/lib/globalConstant/environmentInfo');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/tools/chainSetup/origin/simpleToken/Finalize');
require(rootPrefix + '/tools/chainSetup/origin/simpleToken/Deploy.js');
require(rootPrefix + '/tools/chainSetup/origin/simpleToken/SetAdminAddress');

/**
 * Class to setup simple token.
 *
 * @class SetupSimpleToken
 */
class SetupSimpleToken {
  /**
   * Constructor to setup simple token.
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
      logger.error('lib/setup/originChain/SetupSimpleToken.js::perform::catch');
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 'l_s_oc_fnpm_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    });
  }

  /**
   * Async perform.
   *
   * @return {Promise<result>}
   */
  async _asyncPerform() {
    const oThis = this;

    logger.step('** Generate SimpleToken owner key.');
    const SimpleTokenOwnerDetails = await oThis._generateAddrAndPrivateKey();
    const simpleTokenOwnerAddress = SimpleTokenOwnerDetails.address,
      simpleTokenOwnerPrivateKey = SimpleTokenOwnerDetails.privateKey;

    const originMaxGasPriceMultiplierWithBuffer = basicHelper.getOriginMaxGasPriceMultiplierWithBuffer(),
      amountToFundOriginGasMap = fundingConfig[chainAddressConstants.masterInternalFunderKind].originGas,
      amountForSTOwnerAddressForOneGwei =
        amountToFundOriginGasMap[chainAddressConstants.stContractOwnerKind].fundAmount,
      amountForSTAdminAddressForOneGwei =
        amountToFundOriginGasMap[chainAddressConstants.stContractAdminKind].fundAmount,
      amountForSTOwnerAddress = basicHelper
        .convertToWei(String(amountForSTOwnerAddressForOneGwei))
        .mul(basicHelper.convertToBigNumber(originMaxGasPriceMultiplierWithBuffer)),
      amountForSTAdminAddress = basicHelper
        .convertToWei(String(amountForSTAdminAddressForOneGwei))
        .mul(basicHelper.convertToBigNumber(originMaxGasPriceMultiplierWithBuffer));

    logger.log('* Funding SimpleToken owner address with ETH.');
    await oThis._fundAddressWithEth(simpleTokenOwnerAddress, amountForSTOwnerAddress);
    await basicHelper.sleep(oThis.sleepTime);

    logger.step('** Generate SimpleToken admin key.');
    const SimpleTokenAdminDetails = await oThis._generateAddrAndPrivateKey();
    const simpleTokenAdminAddress = SimpleTokenAdminDetails.address,
      simpleTokenAdminPrivateKey = SimpleTokenAdminDetails.privateKey;

    await oThis.getIc();

    logger.log('* Funding SimpleToken admin address with ETH.');
    await oThis._fundAddressWithEth(simpleTokenAdminAddress, amountForSTAdminAddress);
    await basicHelper.sleep(oThis.sleepTime);

    logger.step('** Generate Granter key.');
    logger.step('** Insert Granter Address into chain addresses and known addresses table.');
    await oThis._generateGranterAddr();
    await basicHelper.sleep(oThis.sleepTime);

    // Deploying contracts now.
    logger.step('** Deploying Simple Token Contract.');
    const simpleTokenContractAddress = await oThis._deploySimpleToken(
      simpleTokenOwnerAddress,
      simpleTokenOwnerPrivateKey
    );
    await basicHelper.sleep(oThis.sleepTime);

    logger.step('** Set Simple Token Admin Address.');
    await oThis.setSimpleTokenAdmin(
      simpleTokenOwnerAddress,
      simpleTokenOwnerPrivateKey,
      simpleTokenAdminAddress,
      simpleTokenContractAddress
    );
    await basicHelper.sleep(oThis.sleepTime);

    logger.step('** Finalize Simple Token Contract.');
    await oThis.finalizeSimpleTokenAdmin(
      simpleTokenAdminAddress,
      simpleTokenAdminPrivateKey,
      simpleTokenContractAddress
    );
    await basicHelper.sleep(oThis.sleepTime);

    return responseHelper.successWithData({
      simpleTokenAdmin: simpleTokenAdminAddress,
      simpleTokenAdminPrivateKey: simpleTokenAdminPrivateKey,
      simpleTokenOwnerAddress: simpleTokenOwnerAddress,
      simpleTokenOwnerPrivateKey: simpleTokenOwnerPrivateKey,
      simpleTokenContractAddress: simpleTokenContractAddress
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
   * Deploy simple token contract.
   *
   * @param {string} simpleTokenOwnerAddr
   * @param {string} simpleTokenOwnerPrivateKey
   *
   * @returns {Promise<*>}
   * @private
   */
  async _deploySimpleToken(simpleTokenOwnerAddr, simpleTokenOwnerPrivateKey) {
    const oThis = this;

    const DeploySimpleToken = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeploySimpleToken'),
      deploySimpleToken = new DeploySimpleToken({
        signerAddress: simpleTokenOwnerAddr,
        signerKey: simpleTokenOwnerPrivateKey
      });

    const deploySimpleTokenRsp = await deploySimpleToken.perform();

    if (deploySimpleTokenRsp.isSuccess()) {
      return Promise.resolve(deploySimpleTokenRsp.data.contractAddress);
    }
    logger.error('Simple Token deployment failed.');

    return Promise.reject(new Error('Simple Token deployment failed.'));
  }

  /**
   * Set simple token admin.
   *
   * @param {string} simpleTokenOwnerAddr
   * @param {string} simpleTokenOwnerPrivateKey
   * @param {string} simpleTokenAdminAddr
   * @param {string} simpleTokenContractAddress
   *
   * @returns {Promise<*>}
   */
  async setSimpleTokenAdmin(
    simpleTokenOwnerAddr,
    simpleTokenOwnerPrivateKey,
    simpleTokenAdminAddr,
    simpleTokenContractAddress
  ) {
    const oThis = this;

    const SetSimpleTokenAdmin = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'SetSimpleTokenAdmin'),
      setSimpleTokenAdmin = new SetSimpleTokenAdmin({
        signerAddress: simpleTokenOwnerAddr,
        signerKey: simpleTokenOwnerPrivateKey,
        adminAddress: simpleTokenAdminAddr,
        simpleTokenContractAddress: simpleTokenContractAddress
      });

    const setSimpleTokenAdminRsp = await setSimpleTokenAdmin.perform();

    if (setSimpleTokenAdminRsp.isSuccess()) {
      return Promise.resolve();
    }
    logger.error('Setting Simple Token admin failed.');

    return Promise.reject(new Error('Setting Simple Token admin failed.'));
  }

  /**
   * Finalize simple token contract.
   *
   * @param {string} simpleTokenAdminAddr
   * @param {string} simpleTokenAdminPrivateKey
   * @param {string} simpleTokenContractAddress
   *
   * @returns {Promise<*>}
   */
  async finalizeSimpleTokenAdmin(simpleTokenAdminAddr, simpleTokenAdminPrivateKey, simpleTokenContractAddress) {
    const oThis = this;

    const FinalizeSimpleToken = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'FinalizeSimpleToken'),
      finalizeSimpleToken = new FinalizeSimpleToken({
        signerAddress: simpleTokenAdminAddr,
        signerKey: simpleTokenAdminPrivateKey,
        simpleTokenContractAddress: simpleTokenContractAddress
      });

    const finalizeSimpleTokenRsp = await finalizeSimpleToken.perform();

    if (finalizeSimpleTokenRsp.isSuccess()) {
      return Promise.resolve();
    }
    logger.error('Finalizing Simple Token failed.');

    return Promise.reject(new Error('Finalizing Simple Token failed.'));
  }

  /**
   * Generate granter address.
   *
   * @returns {Promise<Promise<never> | Promise<any>>}
   * @private
   */
  async _generateGranterAddr() {
    const oThis = this;

    const generateChainKnownAddresses = new GenerateChainKnownAddresses({
      addressKinds: [chainAddressConstants.originGranterKind],
      chainKind: coreConstants.originChainKind,
      chainId: oThis.chainId
    });

    logger.log('* Generating address for granter.');

    const generateOriginAddrRsp = await generateChainKnownAddresses.perform();

    if (!generateOriginAddrRsp.isSuccess()) {
      logger.error('Generating origin chain addresses failed.');

      return Promise.reject(new Error('Generating origin chain addresses failed.'));
    }

    logger.info('Generate Addresses Response: ', generateOriginAddrRsp.toHash());
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
}

module.exports = SetupSimpleToken;
