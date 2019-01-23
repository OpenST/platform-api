'use strict';

/**
 * Generate address for Origin and Auxiliary chains
 *
 * @module devops/utils/GenerateAddress
 */
const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainAddressBase = require(rootPrefix + '/devops/utils/chainAddress/Base'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  TransferAmountOnChain = require(rootPrefix + '/tools/helpers/TransferAmountOnChain');

/**
 * Class for Generating addresses for Origin and Auxiliary chains
 *
 * @class
 */
class GenerateOriginAddress extends ChainAddressBase {
  /**
   * Constructor
   *
   * @param chainId {number}
   *
   * @constructor
   */
  constructor(chainId, ethSenderPk) {
    super(chainId);
    const oThis = this;

    oThis.chainId = chainId;
    oThis.chainKind = coreConstants.originChainKind;
    oThis.ethSenderPk = ethSenderPk;
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

    let addressKinds = [
      chainAddressConstants.deployerKind,
      chainAddressConstants.ownerKind,
      chainAddressConstants.adminKind,
      chainAddressConstants.workerKind,
      chainAddressConstants.chainOwnerKind,
      chainAddressConstants.tokenAdminKind,
      chainAddressConstants.tokenWorkerKind
    ];

    logger.log('* Generating address for origin deployer.');
    logger.log('* Generating address for origin owner.');
    logger.log('* Generating address for origin admin.');
    logger.log('* Generating address for origin worker.');
    logger.log('* Generating address for chain owner.');
    logger.log('* Generating address for origin token admin.');
    logger.log('* Generating address for origin token worker.');

    let addressesResp = await oThis._generateAddresses(addressKinds);

    if(addressesResp.isSuccess()){

      let addresses = addressesResp['data']['addresses'];

      logger.log(`* Funding origin deployer address (${addresses['deployer']}) with ETH.`);
      await oThis._fundAddressWithEth(addresses['deployer'], 3);

      logger.log(`* Funding origin owner address (${addresses['owner']}) with ETH.`);
      await oThis._fundAddressWithEth(addresses['owner'], 0.5);

      logger.log(`* Funding origin admin address (${addresses['admin']}) with ETH.`);
      await oThis._fundAddressWithEth(addresses['admin'], 0.5);

      logger.log(`* Funding origin token admin address (${addresses['tokenAdmin']}) with ETH.`);
      await oThis._fundAddressWithEth(addresses['tokenAdmin'], 0.5);

      logger.log(`* Funding origin token worker address (${addresses['tokenWorker']}) with ETH.`);
      await oThis._fundAddressWithEth(addresses['tokenWorker'], 0.5);
    }

    return addressesResp;
  }

  /**
   * fund address with ETH
   *
   * @param address {string} - address to fund ETH to
   * @param amount {number} - amount in eth which is to be funded
   * @returns {Promise<void>}
   * @private
   */
  async _fundAddressWithEth(address, amount) {
    const oThis = this;

    let providers = await oThis._getProvidersFromConfig(),
      provider = providers.data[0], //select one provider from provider endpoints array
      amountInWei = basicHelper.convertToWei(amount);

    await TransferAmountOnChain._fundAddressWithEthUsingPk(address, oThis.ethSenderPk,oThis.chainId, provider, amountInWei);
  }

  async _getProvidersFromConfig() {
    const oThis = this;

    let csHelper = new ConfigStrategyHelper(0),
      csResponse = await csHelper.getForKind(configStrategyConstants.originGeth),
      configForChain = csResponse.data[configStrategyConstants.originGeth],
      readWriteConfig = configForChain[configStrategyConstants.gethReadWrite],
      providers = readWriteConfig.wsProvider ? readWriteConfig.wsProviders : readWriteConfig.rpcProviders;

    return responseHelper.successWithData(providers);
  }
}

module.exports = GenerateOriginAddress;
