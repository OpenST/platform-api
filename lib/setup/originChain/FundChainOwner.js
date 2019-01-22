'use strict';

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  transferAmountOnChain = require(rootPrefix + '/tools/helpers/TransferAmountOnChain');

class FundChainOwner {
  /**
   * Constructor
   *
   * @constructor
   */
  constructor(funderPrivateKey) {
    const oThis = this;
    oThis.funderPrivateKey = funderPrivateKey;
  }

  /**
   *
   * Perform
   *
   * @return {Promise<result>}
   *
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('lib/setup/originChain/FundChainOwner.js::perform::catch');
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
   *
   * async perform
   *
   * @return {Promise<result>}
   *
   */
  async _asyncPerform() {
    const oThis = this;

    logger.log('* Simple Token Owner funding chain owner address with OST.');
    await oThis._fundSTOwnerWithOst();

    return Promise.resolve('Funding chain owner address with OST successfully performed.');
  }

  async _fundSTOwnerWithOst() {
    const oThis = this;

    let providers = await oThis._getProvidersFromConfig(),
      provider = providers.data[0], //select one provider from provider endpoints array
      amountInWei = basicHelper.convertToWei(1000000); // transfer amount

    await oThis._getChainOwnerAddress();

    await transferAmountOnChain._fundAddressWithOst(
      oThis.chainOwnerAddress,
      oThis.funderPrivateKey,
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

    oThis.chainId = configForChain.chainId;

    return Promise.resolve(responseHelper.successWithData(providers));
  }

  async _getChainOwnerAddress() {
    const oThis = this;

    let chainOwnerAddressRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.chainId,
      kind: chainAddressConstants.chainOwnerKind
    });

    oThis.chainOwnerAddress = chainOwnerAddressRsp.data.address;
  }
}

module.exports = FundChainOwner;
