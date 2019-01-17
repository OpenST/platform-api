'use strict';

/**
 * @fileoverview Helper class for setting up Origin GETH and funding the required addresses
 */
const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  fileManager = require(rootPrefix + '/tools/localSetup/fileManager'),
  gethManager = require(rootPrefix + '/tools/localSetup/gethManager'),
  serviceManager = require(rootPrefix + '/tools/localSetup/serviceManager'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  transferAmountOnChain = require(rootPrefix + '/tools/helpers/TransferAmountOnChain');

const GenerateChainKnownAddresses = require(rootPrefix + '/tools/helpers/GenerateChainKnownAddresses');

class OriginGethSetup {
  /**
   * constructor
   *
   * @constructor
   *
   * @param originChainId - origin chain id
   */
  constructor(originChainId) {
    const oThis = this;
    oThis.originChainId = originChainId;
  }

  /**
   * perform
   *
   * @returns {Promise<void>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('lib/setup/originChain/Geth.js::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 't_ls_ocs_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * async perform
   *
   * @returns {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    logger.step('** Starting fresh setup');
    await fileManager.freshSetup();

    logger.step('** Generating addresses for Origin');
    await oThis._generateOriginAddr();

    logger.step('** Generating sealer address on GETH and init GETH with genesis');
    await gethManager.initChain(coreConstants.originChainKind, oThis.originChainId);

    logger.step('** Starting origin geth for deployment.');
    await serviceManager.startGeth(coreConstants.originChainKind, oThis.originChainId, 'deployment');

    logger.log('* Funding origin deployer address with ETH.');
    await oThis._fundAddressWithEth(oThis.deployerAddr);

    logger.log('* Funding origin owner address with ETH.');
    await oThis._fundAddressWithEth(oThis.ownerAddr);

    logger.log('* Funding origin admin address with ETH.');
    await oThis._fundAddressWithEth(oThis.adminAddr);

    logger.step('* Stopping origin geth.');
    await serviceManager.stopOriginGeth(oThis.originChainId);
    logger.info('** You can start geth from script in future:');

    let gethRunCommand =
      'sh ~/openst-setup/bin/origin-' + oThis.originChainId + '/origin-chain-' + oThis.originChainId + '.sh';

    logger.info('gethRunCommand:', gethRunCommand);

    return gethRunCommand;
  }

  /**
   * Generate origin address
   *
   * @returns {Promise<Promise<never> | Promise<any>>}
   * @private
   */
  async _generateOriginAddr() {
    const oThis = this;

    let generateChainKnownAddresses = new GenerateChainKnownAddresses({
      addressKinds: [
        chainAddressConstants.deployerKind,
        chainAddressConstants.ownerKind,
        chainAddressConstants.adminKind,
        chainAddressConstants.workerKind,
        chainAddressConstants.chainOwnerKind
      ],
      chainKind: coreConstants.originChainKind,
      chainId: oThis.originChainId
    });

    logger.log('* Generating address for origin deployer.');
    logger.log('* Generating address for origin owner.');
    logger.log('* Generating address for origin admin.');
    logger.log('* Generating address for origin worker.');
    logger.log('* Generating address for origin chain owner.');

    let generateOriginAddrRsp = await generateChainKnownAddresses.perform();

    if (!generateOriginAddrRsp.isSuccess()) {
      logger.error('Generating origin chain addresses failed');
      return Promise.reject();
    }

    logger.info('Generate Addresses Response: ', generateOriginAddrRsp.toHash());

    let addresses = generateOriginAddrRsp.data['addressKindToValueMap'];

    oThis.deployerAddr = addresses[chainAddressConstants.deployerKind];
    oThis.ownerAddr = addresses[chainAddressConstants.ownerKind];
    oThis.adminAddr = addresses[chainAddressConstants.adminKind];
  }

  /**
   * fund address with ETH
   *
   * @param address {string} - address to fund ETH to
   * @returns {Promise<void>}
   * @private
   */
  async _fundAddressWithEth(address) {
    const oThis = this;

    let providers = await oThis._getProvidersFromConfig(),
      provider = providers.data[0], //select one provider from provider endpoints array
      amountInWei = basicHelper.convertToWei(2);

    await transferAmountOnChain._fundAddressWithEth(address, oThis.originChainId, provider, amountInWei);
  }

  /**
   * get providers from config
   *
   * @returns {Promise<any>}
   * @private
   */
  async _getProvidersFromConfig() {
    let csHelper = new ConfigStrategyHelper(0),
      csResponse = await csHelper.getForKind(configStrategyConstants.originGeth),
      configForChain = csResponse.data[configStrategyConstants.originGeth],
      readWriteConfig = configForChain[configStrategyConstants.gethReadWrite],
      providers = readWriteConfig.wsProvider ? readWriteConfig.wsProviders : readWriteConfig.rpcProviders;

    return responseHelper.successWithData(providers);
  }
}

module.exports = OriginGethSetup;
