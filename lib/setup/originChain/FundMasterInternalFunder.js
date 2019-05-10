/**
 * Module to fund master internal funder address.
 *
 * @module lib/setup/originChain/FundMasterInternalFunder
 */

const rootPrefix = '../../..',
  TransferOstUsingPK = require(rootPrefix + '/lib/fund/erc20/TransferUsingPK'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  conversionRatesConstants = require(rootPrefix + '/lib/globalConstant/conversionRates'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

/**
 * Class to fund master internal funder address.
 *
 * @class FundMasterInternalFunder
 */
class FundMasterInternalFunder {
  /**
   * Constructor to fund master internal funder address.
   *
   * @param {string} stOwnerPrivateKey
   *
   * @constructor
   */
  constructor(stOwnerPrivateKey) {
    const oThis = this;

    oThis.stOwnerPrivateKey = stOwnerPrivateKey;
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
      logger.error('lib/setup/originChain/FundMasterInternalFunder.js::perform::catch');
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 'l_s_oc_fmif_1',
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

    logger.log('* Simple Token Owner funding master internal funder address with OST.');
    await oThis._fundMasterInternalFunderWithOst();

    return Promise.resolve('Funding chain owner address with OST successfully performed.');
  }

  /**
   * Fund master internal funder with OST.
   *
   * @return {Promise<void>}
   * @private
   */
  async _fundMasterInternalFunderWithOst() {
    const oThis = this;

    const providers = await oThis._getProvidersFromConfig(),
      provider = providers[0], // Select one provider from provider endpoints array.
      amountInWei = basicHelper
        .convertToLowerUnit(coreConstants.FUND_MIF_WITH_OST_AMOUNT, coreConstants.OST_DECIMALS)
        .toString(10);

    await oThis._getMasterInternalFunderAddress();

    await new TransferOstUsingPK({
      toAddress: oThis.masterInternalFunderAddress,
      fromAddressPrivateKey: oThis.stOwnerPrivateKey,
      amountInWei: amountInWei,
      originChainId: oThis.chainId,
      tokenSymbol: conversionRatesConstants.OST,
      provider: provider
    }).perform();
  }

  /**
   * Get providers from config.
   *
   * @sets oThis.chainId
   *
   * @return {Promise<*>}
   * @private
   */
  async _getProvidersFromConfig() {
    const oThis = this;

    const csHelper = new ConfigStrategyHelper(0),
      csResponse = await csHelper.getForKind(configStrategyConstants.originGeth),
      configForChain = csResponse.data[configStrategyConstants.originGeth],
      readWriteConfig = configForChain[configStrategyConstants.gethReadWrite];

    oThis.chainId = configForChain.chainId;

    return readWriteConfig.wsProvider ? readWriteConfig.wsProviders : readWriteConfig.rpcProviders;
  }

  /**
   * Fetch master internal funder address.
   *
   * @sets oThis.masterInternalFunderAddress
   *
   * @return {Promise<never>}
   * @private
   */
  async _getMasterInternalFunderAddress() {
    const oThis = this;

    // Fetch all addresses associated with origin chain id.
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_oc_fmif_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.masterInternalFunderAddress = chainAddressesRsp.data[chainAddressConstants.masterInternalFunderKind].address;
  }
}

module.exports = FundMasterInternalFunder;
