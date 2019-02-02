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
      chainAddressConstants.originDeployerKind,
      chainAddressConstants.masterInternalFunderKind,

      chainAddressConstants.stOrgContractOwnerKind,
      chainAddressConstants.originAnchorOrgContractOwnerKind,

      chainAddressConstants.stOrgContractAdminKind,
      chainAddressConstants.originAnchorOrgContractAdminKind,

      chainAddressConstants.stOrgContractWorkerKind,
      chainAddressConstants.originAnchorOrgContractWorkerKind,

      chainAddressConstants.originDefaultBTOrgContractAdminKind,
      chainAddressConstants.originDefaultBTOrgContractWorkerKind
    ];

    logger.log('* Generating address originDeployerKind.');
    logger.log('* Generating address masterInternalFunderKind.');
    logger.log('* Generating address stOrgContractOwnerKind.');
    logger.log('* Generating address originAnchorOrgContractOwnerKind.');
    logger.log('* Generating address stOrgContractAdminKind.');
    logger.log('* Generating address originAnchorOrgContractAdminKind.');
    logger.log('* Generating address stOrgContractWorkerKind.');
    logger.log('* Generating address originAnchorOrgContractWorkerKind.');
    logger.log('* Generating address originDefaultBTOrgContractAdminKind.');
    logger.log('* Generating address originDefaultBTOrgContractWorkerKind.');

    let addressesResp = await oThis._generateAddresses(addressKinds);

    if (addressesResp.isSuccess()) {
      let addresses = addressesResp['data']['addresses'];

      logger.log(
        `* Funding origin deployer address (${addresses[chainAddressConstants.originDeployerKind]}) with ETH.`
      );
      await oThis._fundAddressWithEth(
        addresses[chainAddressConstants.originDeployerKind],
        0.53591 * oThis.numberOfFlowsForGas
      );

      logger.log(
        `* Funding origin owner address (${addresses[chainAddressConstants.stOrgContractOwnerKind]}) with ETH.`
      );
      await oThis._fundAddressWithEth(
        addresses[chainAddressConstants.stOrgContractOwnerKind],
        0.00239 * oThis.numberOfFlowsForGas
      );

      logger.log(
        `* Funding origin owner address (${
          addresses[chainAddressConstants.originAnchorOrgContractOwnerKind]
        }) with ETH.`
      );
      await oThis._fundAddressWithEth(
        addresses[chainAddressConstants.originAnchorOrgContractOwnerKind],
        0.00116 * oThis.numberOfFlowsForGas
      );

      // logger.log(`* Funding origin admin address (${addresses[chainAddressConstants.stOrgContractAdminKind]}) with ETH.`);
      // await oThis._fundAddressWithEth(addresses[chainAddressConstants.stOrgContractAdminKind], 0.00000 * oThis.numberOfFlowsForGas);
      //
      // logger.log(`* Funding origin admin address (${addresses[chainAddressConstants.originAnchorOrgContractAdminKind]}) with ETH.`);
      // await oThis._fundAddressWithEth(addresses[chainAddressConstants.originAnchorOrgContractAdminKind], 0.00000 * oThis.numberOfFlowsForGas);

      // logger.log(`* Funding origin chain owner address (${addresses[chainAddressConstants.masterInternalFunderKind]}) with ETH.`);
      // await oThis._fundAddressWithEth(addresses[chainAddressConstants.masterInternalFunderKind], 0.01265 * oThis.numberOfFlowsForGas);

      logger.log(
        `* Funding origin token admin address (${
          addresses[chainAddressConstants.originDefaultBTOrgContractAdminKind]
        }) with ETH.`
      );
      await oThis._fundAddressWithEth(
        addresses[chainAddressConstants.originDefaultBTOrgContractAdminKind],
        0.0024 * oThis.numberOfFlowsForGas
      );

      logger.log(
        `* Funding origin token worker address (${
          addresses[chainAddressConstants.originDefaultBTOrgContractWorkerKind]
        }) with ETH.`
      );
      await oThis._fundAddressWithEth(
        addresses[chainAddressConstants.originDefaultBTOrgContractWorkerKind],
        0.00172 * oThis.numberOfFlowsForGas
      );
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

    await TransferAmountOnChain._fundAddressWithEthUsingPk(
      address,
      oThis.ethSenderPk,
      oThis.chainId,
      provider,
      amountInWei
    );
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
