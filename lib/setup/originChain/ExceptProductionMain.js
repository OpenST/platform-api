'use strict';

const OSTBase = require('@ostdotcom/base');

const rootPrefix = '../../..',
  InstanceComposer = OSTBase.InstanceComposer,
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  GeneratePrivateKey = require(rootPrefix + '/tools/helpers/GeneratePrivateKey'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  GenerateChainKnownAddresses = require(rootPrefix + '/tools/helpers/GenerateChainKnownAddresses'),
  environmentInfoConstants = require(rootPrefix + '/lib/globalConstant/environmentInfo'),
  TransferEthUsingPK = require(rootPrefix + '/lib/fund/eth/TransferUsingPK');

require(rootPrefix + '/tools/chainSetup/origin/simpleToken/Finalize');
require(rootPrefix + '/tools/chainSetup/origin/simpleToken/Deploy.js');
require(rootPrefix + '/tools/chainSetup/origin/simpleToken/SetAdminAddress');

class ExceptProductionMain {
  /**
   * Constructor
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
   * Perform
   *
   * @return {Promise<result>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('lib/setup/originChain/ExceptProductionMain.js::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'l_s_oc_fnpm_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   *
   * async perform
   *
   * @return {Promise<result>}
   *
   */
  async _asyncPerform() {
    const oThis = this;

    logger.step('** Generate SimpleToken owner key.');
    let SimpleTokenOwnerDetails = await oThis._generateAddrAndPrivateKey();
    let simpleTokenOwnerAddress = SimpleTokenOwnerDetails.address,
      simpleTokenOwnerPrivateKey = SimpleTokenOwnerDetails.privateKey;

    logger.log('* Funding SimpleToken owner address with ETH.');
    await oThis._fundAddressWithEth(simpleTokenOwnerAddress);
    await basicHelper.pauseForMilliSeconds(oThis.sleepTime);

    logger.step('** Generate SimpleToken admin key.');
    let SimpleTokenAdminDetails = await oThis._generateAddrAndPrivateKey();
    let simpleTokenAdminAddress = SimpleTokenAdminDetails.address,
      simpleTokenAdminPrivateKey = SimpleTokenAdminDetails.privateKey;

    logger.log('* Funding SimpleToken admin address with ETH.');
    await oThis._fundAddressWithEth(simpleTokenAdminAddress);
    await basicHelper.pauseForMilliSeconds(oThis.sleepTime);

    logger.step('** Generate Granter key.');
    logger.step('** Insert Granter Address into chain addresses and known addresses table.');
    await oThis._generateGranterAddr();
    await basicHelper.pauseForMilliSeconds(oThis.sleepTime);

    // deploying contracts now
    logger.step('** Deploying Simple Token Contract');
    await oThis._deploySimpleToken(simpleTokenOwnerAddress, simpleTokenOwnerPrivateKey);
    await basicHelper.pauseForMilliSeconds(oThis.sleepTime);

    logger.step('** Set Simple Token Admin Address.');
    await oThis.setSimpleTokenAdmin(simpleTokenOwnerAddress, simpleTokenOwnerPrivateKey, simpleTokenAdminAddress);
    await basicHelper.pauseForMilliSeconds(oThis.sleepTime);

    logger.step('** Finalize Simple Token Contract');
    await oThis.finalizeSimpleTokenAdmin(simpleTokenAdminAddress, simpleTokenAdminPrivateKey);
    await basicHelper.pauseForMilliSeconds(oThis.sleepTime);

    return responseHelper.successWithData({
      simpleTokenAdmin: simpleTokenAdminAddress,
      simpleTokenAdminPrivateKey: simpleTokenAdminPrivateKey,
      simpleTokenOwnerAddress: simpleTokenOwnerAddress,
      simpleTokenOwnerPrivateKey: simpleTokenOwnerPrivateKey
    });
  }

  /**
   * Generate new address
   *
   * @returns {*}
   *
   * @private
   */
  _generateAddrAndPrivateKey() {
    let generatePrivateKey = new GeneratePrivateKey();
    let generatePrivateKeyRsp = generatePrivateKey.perform();
    logger.log('Generated Address: ', generatePrivateKeyRsp.data);
    return generatePrivateKeyRsp.data;
  }

  /**
   * Deploy Simple Token Contract
   *
   * @param simpleTokenOwnerAddr
   * @param simpleTokenOwnerPrivateKey
   *
   * @returns {Promise<*>}
   * @private
   */
  async _deploySimpleToken(simpleTokenOwnerAddr, simpleTokenOwnerPrivateKey) {
    let configStrategyHelper = new ConfigStrategyHelper(0, 0),
      configRsp = await configStrategyHelper.getComplete(),
      ic = new InstanceComposer(configRsp.data);

    let DeploySimpleToken = ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeploySimpleToken'),
      deploySimpleToken = new DeploySimpleToken({
        signerAddress: simpleTokenOwnerAddr,
        signerKey: simpleTokenOwnerPrivateKey
      });

    let deploySimpleTokenRsp = await deploySimpleToken.perform();

    if (deploySimpleTokenRsp.isSuccess()) {
      return Promise.resolve();
    } else {
      logger.error('deploySimpleToken failed');
      return Promise.reject();
    }
  }

  /**
   * Set Simple Token Admin
   *
   * @param simpleTokenOwnerAddr
   * @param simpleTokenOwnerPrivateKey
   * @param simpleTokenAdminAddr
   *
   * @returns {Promise<*>}
   */
  async setSimpleTokenAdmin(simpleTokenOwnerAddr, simpleTokenOwnerPrivateKey, simpleTokenAdminAddr) {
    let configStrategyHelper = new ConfigStrategyHelper(0, 0),
      configRsp = await configStrategyHelper.getComplete(),
      ic = new InstanceComposer(configRsp.data);

    let SetSimpleTokenAdmin = ic.getShadowedClassFor(coreConstants.icNameSpace, 'SetSimpleTokenAdmin'),
      setSimpleTokenAdmin = new SetSimpleTokenAdmin({
        signerAddress: simpleTokenOwnerAddr,
        signerKey: simpleTokenOwnerPrivateKey,
        adminAddress: simpleTokenAdminAddr
      });

    let setSimpleTokenAdminRsp = await setSimpleTokenAdmin.perform();

    if (setSimpleTokenAdminRsp.isSuccess()) {
      return Promise.resolve();
    } else {
      logger.error('setSimpleTokenAdmin failed');
      return Promise.reject();
    }
  }

  /**
   * Finalize Simple Token Contract
   *
   * @param simpleTokenAdminAddr
   * @param simpleTokenAdminPrivateKey
   *
   * @returns {Promise<*>}
   */
  async finalizeSimpleTokenAdmin(simpleTokenAdminAddr, simpleTokenAdminPrivateKey) {
    let configStrategyHelper = new ConfigStrategyHelper(0, 0),
      configRsp = await configStrategyHelper.getComplete(),
      ic = new InstanceComposer(configRsp.data);

    let FinalizeSimpleToken = ic.getShadowedClassFor(coreConstants.icNameSpace, 'FinalizeSimpleToken'),
      finalizeSimpleToken = new FinalizeSimpleToken({
        signerAddress: simpleTokenAdminAddr,
        signerKey: simpleTokenAdminPrivateKey
      });

    let finalizeSimpleTokenRsp = await finalizeSimpleToken.perform();

    if (finalizeSimpleTokenRsp.isSuccess()) {
      return Promise.resolve();
    } else {
      logger.error('finalizeSimpleToken failed');
      return Promise.reject();
    }
  }

  /**
   * Generate granter address
   *
   * @returns {Promise<Promise<never> | Promise<any>>}
   *
   * @private
   */
  async _generateGranterAddr() {
    const oThis = this;

    let generateChainKnownAddresses = new GenerateChainKnownAddresses({
      addressKinds: [chainAddressConstants.originGranterKind],
      chainKind: coreConstants.originChainKind,
      chainId: oThis.chainId
    });

    logger.log('* Generating address for granter.');

    let generateOriginAddrRsp = await generateChainKnownAddresses.perform();

    if (!generateOriginAddrRsp.isSuccess()) {
      logger.error('Generating origin chain addresses failed');
      return Promise.reject();
    }

    logger.info('Generate Addresses Response: ', generateOriginAddrRsp.toHash());
  }

  /**
   * fund address with ETH
   *
   * @param address {string} - address to fund ETH to
   * @returns {Promise<void>}
   *
   * @private
   */
  async _fundAddressWithEth(address) {
    const oThis = this;

    let providers = await oThis._getProvidersFromConfig(),
      provider = providers.data[0], //select one provider from provider endpoints array
      amountInWei = basicHelper.convertToWei(2).toString(10); //TODO-FUNDING:

    await new TransferEthUsingPK({
      toAddress: address,
      fromAddressPrivateKey: oThis.ethOwnerPrivateKey,
      amountInWei: amountInWei,
      originChainId: oThis.chainId,
      provider: provider
    }).perform();
  }

  /**
   * get providers from config
   *
   * @return {Promise<any>}
   *
   * @private
   */
  async _getProvidersFromConfig() {
    let csHelper = new ConfigStrategyHelper(0),
      csResponse = await csHelper.getForKind(configStrategyConstants.originGeth),
      configForChain = csResponse.data[configStrategyConstants.originGeth],
      readWriteConfig = configForChain[configStrategyConstants.gethReadWrite],
      providers = readWriteConfig.wsProvider ? readWriteConfig.wsProviders : readWriteConfig.rpcProviders;

    return Promise.resolve(responseHelper.successWithData(providers));
  }
}

module.exports = ExceptProductionMain;
