'use strict';
/**
 * Fund master internal funder address with ETH from external private key
 *
 * @module devops/utils/chainAddress/FundMasterInternalFunderAddress
 */

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ChainAddressBase = require(rootPrefix + '/devops/utils/chainAddress/Base'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  TransferEthUsingPK = require(rootPrefix + '/lib/fund/eth/TransferUsingPK'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress');

/**
 * Class to fund master internal funder address with ETH from external private key
 *
 * @class
 */
class FundMasterInternalFunderAddress extends ChainAddressBase {
  /**
   * Constructor
   *
   * @param chainId
   * @param ethOwnerPrivateKey
   * @param amount
   *
   * @constructor
   */
  constructor(chainId, ethOwnerPrivateKey, amount) {
    super();

    const oThis = this;
    oThis.chainId = chainId;
    oThis.ethOwnerPrivateKey = ethOwnerPrivateKey;
    oThis.amount = amount;
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

    // Fetch all addresses associated with origin chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(oThis._getRespError('do_u_ca_fmifa_ap1'));
    }

    let masterInternalFunderAddr = chainAddressesRsp.data[chainAddressConstants.masterInternalFunderKind].address;
    logger.log(`* Fund address of kind masterInternalFunderKind: ${masterInternalFunderAddr}`);

    await oThis._fundAddressWithEth(masterInternalFunderAddr, oThis.amount);

    return responseHelper.successWithData({});
  }

  /**
   * fund address with ETH
   *
   * @param address {string} - Address for which fund needs to be transfered
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fundAddressWithEth(address, amount) {
    const oThis = this;

    let providers = await oThis._getProvidersFromConfig(),
      provider = providers.data[0],
      amountInWei = basicHelper.convertToWei(amount).toString(10); // transfer amount

    await new TransferEthUsingPK({
      toAddress: address,
      fromAddressPrivateKey: oThis.ethOwnerPrivateKey,
      amountInWei: amountInWei,
      originChainId: oThis.chainId,
      provider: provider
    }).perform();
  }

  /**
   * Get providers from configs
   *
   * @returns {Promise<void>}
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

module.exports = FundMasterInternalFunderAddress;
