'use strict';

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  transferAmountOnChain = require(rootPrefix + '/tools/helpers/TransferAmountOnChain');

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
        logger.error('lib/setup/originChain/OnlyForDevEnv.js::perform::catch');
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

    await oThis._getGranterAddress();

    logger.log('* Chain Owner funding granter address with ETH.');
    await oThis._fundGranterAddressWithEth(); //from chain owner

    logger.log('* Simple Token Owner funding granter address with ETH.');
    await oThis._fundGranterAddressWithOst(); //from ST owner

    return responseHelper.successWithData({});
  }

  async _getGranterAddress() {
    const oThis = this;

    let whereClause = [
        'chain_kind = ? AND kind = ? AND status = 1',
        chainAddressConstants.invertedChainKinds[coreConstants.originChainKind],
        chainAddressConstants.invertedKinds[chainAddressConstants.granterKind]
      ],
      granterAddressRsp = await new ChainAddressModel()
        .select(['address'])
        .where(whereClause)
        .fire();

    oThis.granterAddress = granterAddressRsp[0].address;

    logger.debug('Granter Address----', oThis.granterAddress);
  }

  /**
   *
   * @return {Promise<void>}
   * @private
   */
  async _fundGranterAddressWithEth() {
    const oThis = this;

    let providers = await oThis._getProvidersFromConfig(),
      provider = providers.data[0], //select one provider from provider endpoints array
      amountInWei = basicHelper.convertToWei(2); // transfer amount

    if (oThis.ethSenderPk) {
      await transferAmountOnChain._fundAddressWithEthUsingPk(
        oThis.granterAddress,
        oThis.ethSenderPk,
        oThis.chainId,
        provider,
        amountInWei
      );
    } else {
      await transferAmountOnChain._fundAddressWithEth(oThis.granterAddress, oThis.chainId, provider, amountInWei);
    }
  }

  async _fundGranterAddressWithOst() {
    const oThis = this;

    let providers = await oThis._getProvidersFromConfig(),
      provider = providers.data[0], //select one provider from provider endpoints array
      amountInWei = basicHelper.convertToWei(5000); // transfer amount

    await transferAmountOnChain._fundAddressWithOst(
      oThis.granterAddress,
      oThis.stOwnerPrivateKey,
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
}

module.exports = OnlyForDevEnv;
