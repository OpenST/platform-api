/**
 * Module to fund master internal funder address with ETH from external private key.
 *
 * @module devops/utils/chainAddress/FundMasterInternalFunderAddress
 */

const rootPrefix = '../../..',
  ChainAddressBase = require(rootPrefix + '/devops/utils/chainAddress/Base'),
  TransferEthUsingPK = require(rootPrefix + '/lib/fund/eth/TransferUsingPK'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

/**
 * Class to fund master internal funder address with ETH from external private key.
 *
 * @class FundMasterInternalFunderAddress
 */
class FundMasterInternalFunderAddress extends ChainAddressBase {
  /**
   * Constructor to fund master internal funder address with ETH from external private key.
   *
   * @param {number} chainId
   * @param {string} ethOwnerPrivateKey
   * @param {string} amount
   *
   * @augments ChainAddressBase
   *
   * @constructor
   */
  constructor(chainId, ethOwnerPrivateKey, amount) {
    super(chainId);

    const oThis = this;

    oThis.ethOwnerPrivateKey = ethOwnerPrivateKey;
    oThis.amount = amount;
  }

  /**
   * Async perform.
   *
   * @return {Promise<result>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    // Fetch all addresses associated with origin chain id.
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(oThis._getRespError('do_u_ca_fmifa_ap1'));
    }

    const masterInternalFunderAddr = chainAddressesRsp.data[chainAddressConstants.masterInternalFunderKind].address;
    logger.log(`* Fund address of kind masterInternalFunderKind: ${masterInternalFunderAddr}`);

    await oThis._fundAddressWithEth(masterInternalFunderAddr, oThis.amount);

    return responseHelper.successWithData({});
  }

  /**
   * Fund address with ETH.
   *
   * @param {string} address: Address for which fund needs to be transferred
   * @param {string} amount
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fundAddressWithEth(address, amount) {
    const oThis = this;

    const providers = await oThis._getProvidersFromConfig(),
      provider = providers.data[0],
      amountInWei = basicHelper.convertToWei(amount).toString(10); // Transfer amount

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
   * @returns {Promise<void>}
   * @private
   */
  async _getProvidersFromConfig() {
    const csHelper = new ConfigStrategyHelper(0),
      csResponse = await csHelper.getForKind(configStrategyConstants.originGeth),
      configForChain = csResponse.data[configStrategyConstants.originGeth],
      readWriteConfig = configForChain[configStrategyConstants.gethReadWrite],
      providers = readWriteConfig.wsProvider ? readWriteConfig.wsProviders : readWriteConfig.rpcProviders;

    return Promise.resolve(responseHelper.successWithData(providers));
  }
}

module.exports = FundMasterInternalFunderAddress;
