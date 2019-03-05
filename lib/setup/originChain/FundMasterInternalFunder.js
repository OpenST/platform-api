'use strict';

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  TransferOstUsingPK = require(rootPrefix + '/lib/fund/ost/TransferUsingPK'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress');

class FundMasterInternalFunder {
  /**
   * Constructor
   *
   * @constructor
   */
  constructor(stOwnerPrivateKey) {
    const oThis = this;
    oThis.stOwnerPrivateKey = stOwnerPrivateKey;
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
        logger.error('lib/setup/originChain/FundMasterInternalFunder.js::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'l_s_oc_fco_1',
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
      amountInWei = basicHelper.convertToWei(coreConstants.FUND_ST_OWNER_WITH_OST_AMOUNT).toString(10);

    await oThis._getMasterInternalFunderAddress();

    await new TransferOstUsingPK({
      toAddress: oThis.masterInternalFunderAddress,
      fromAddressPrivateKey: oThis.stOwnerPrivateKey,
      amountInWei: amountInWei,
      originChainId: oThis.chainId,
      provider: provider
    }).perform();
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

  /**
   * Fetch master internal funder address.
   *
   * @return {Promise<never>}
   *
   * @private
   */
  async _getMasterInternalFunderAddress() {
    const oThis = this;

    // Fetch all addresses associated with origin chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_oc_fco_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.masterInternalFunderAddress = chainAddressesRsp.data[chainAddressConstants.masterInternalFunderKind].address;
  }
}

module.exports = FundMasterInternalFunder;
