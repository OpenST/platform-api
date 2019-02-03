'use strict';

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  transferAmountOnChain = require(rootPrefix + '/tools/helpers/TransferAmountOnChain'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress');

class OnlyForDevEnv {
  /**
   * Constructor
   *
   * @constructor
   */
  constructor(ownerPk, ethSenderPk) {
    const oThis = this;

    oThis.stOwnerPrivateKey = ownerPk;
    oThis.ethSenderPk = ethSenderPk;
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
        logger.error('lib/setup/originChain/OnlyForDevEnv.js::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'l_s_oc_ofde_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * Async perform
   *
   * @return {Promise<result>}
   *
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._getGranterAddress();

    logger.log('* Chain Owner funding granter address with ETH.');
    await oThis._fundGranterAddressWithEth(); //from chain owner

    logger.log('* Simple Token Owner funding granter address with OST.');
    await oThis._fundGranterAddressWithOst(); //from ST owner

    return responseHelper.successWithData({});
  }

  /**
   * Fetch granter address.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _getGranterAddress() {
    const oThis = this;

    // Fetch all addresses associated with origin chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_oc_ofde_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.originGranterAddress = chainAddressesRsp.data[chainAddressConstants.originGranterKind].address;
  }

  /**
   * Fund address with eth.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fundGranterAddressWithEth() {
    const oThis = this;

    let providers = await oThis._getProvidersFromConfig(),
      provider = providers.data[0], //select one provider from provider endpoints array
      amountInWei = basicHelper.convertToWei(2).toString(10); // transfer amount

    if (oThis.ethSenderPk) {
      await transferAmountOnChain._fundAddressWithEthUsingPk(
        oThis.originGranterAddress,
        oThis.ethSenderPk,
        oThis.chainId,
        provider,
        amountInWei
      );
    } else {
      await transferAmountOnChain._fundAddressWithEth(oThis.originGranterAddress, oThis.chainId, provider, amountInWei);
    }
  }

  /**
   * Fund address with ost.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fundGranterAddressWithOst() {
    const oThis = this;

    let providers = await oThis._getProvidersFromConfig(),
      provider = providers.data[0], //select one provider from provider endpoints array
      amountInWei = basicHelper.convertToWei(50000); // transfer amount

    await transferAmountOnChain._fundAddressWithOst(
      oThis.originGranterAddress,
      oThis.stOwnerPrivateKey,
      oThis.chainId,
      provider,
      amountInWei
    );
  }

  /**
   * Get providers from config.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _getProvidersFromConfig() {
    const oThis = this;

    let csHelper = new ConfigStrategyHelper(0),
      csResponse = await csHelper.getForKind(configStrategyConstants.originGeth),
      configForChain = csResponse.data[configStrategyConstants.originGeth],
      readWriteConfig = configForChain[configStrategyConstants.gethReadWrite],
      providers = readWriteConfig.wsProvider ? readWriteConfig.wsProviders : readWriteConfig.rpcProviders;

    oThis.chainId = configForChain.chainId;

    return Promise.resolve(responseHelper.successWithData(providers));
  }
}

module.exports = OnlyForDevEnv;
