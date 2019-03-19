const rootPrefix = '../..',
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  StakerWhitelistedAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/StakerWhitelistedAddress');

class Base {
  constructor() {
    const oThis = this;

    oThis.payloadDetails = null;
    oThis.gatewayComposer = null;
    oThis.originChainConfig = null;
    oThis.originWsProviders = null;
    oThis.originWeb3 = null;
    oThis.auxChainConfig = null;
    oThis.auxWsProviders = null;
    oThis.auxWeb3 = null;
  }

  /**
   * Perform
   *
   * @return {Promise|*|Promise<T>}
   */
  perform(payloadDetails) {
    const oThis = this;

    // Pending tx payload
    oThis.payloadDetails = payloadDetails;

    return oThis._asyncPerform().catch((error) => {
      if (responseHelper.isCustomResult(error)) {
        return error;
      }
      logger.error(`${__filename}::perform::catch`);
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 'l_smm_b_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    });
  }

  /**
   * _setWeb3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    if (oThis.originChainId) {
      await oThis._setOriginWeb3Instance();
    }

    if (oThis.auxChainId) {
      await oThis._setAuxWeb3Instance();
    }
  }

  /**
   * _setWeb3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setOriginWeb3Instance() {
    const oThis = this;

    const response = await chainConfigProvider.getFor([oThis.originChainId]);

    oThis.originChainConfig = response[oThis.originChainId];
    oThis.originWsProviders = oThis.originChainConfig.originGeth.readWrite.wsProviders;
    oThis.originWeb3 = web3Provider.getInstance(oThis.originWsProviders[0]).web3WsProvider;
  }

  /**
   * _setAuxWeb3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setAuxWeb3Instance() {
    const oThis = this;

    const response = await chainConfigProvider.getFor([oThis.auxChainId]);

    oThis.auxChainConfig = response[oThis.auxChainId];
    oThis.auxWsProviders = oThis.auxChainConfig.auxGeth.readWrite.wsProviders;
    oThis.auxWeb3 = web3Provider.getInstance(oThis.auxWsProviders[0]).web3WsProvider;
  }

  /**
   * Perform transaction, create entry in pending transactions
   *
   * @param chainId
   * @param wsProvider
   * @param from
   * @param to
   * @param txOptions
   * @param data
   *
   * @return {Promise<void>}
   */
  async performTransaction(chainId, wsProvider, from, to, txOptions, data) {
    const oThis = this;

    const defaultOptions = {
      gas: '0', // Mandatory to pass this value.
      value: '0x0',
      from: from,
      to: to,
      data: data
    };

    if (txOptions) {
      Object.assign(defaultOptions, txOptions);
    }
    txOptions = defaultOptions;

    let submitTxParams = {
      chainId: chainId,
      txOptions: txOptions,
      provider: wsProvider,
      options: oThis.payloadDetails
    };

    Object.assign(submitTxParams, oThis._customSubmitTxParams);

    const submitTransactionObj = new SubmitTransaction(submitTxParams);

    return submitTransactionObj.perform();
  }

  /**
   * _fetchGatewayComposer
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchStakerGatewayComposer() {
    const oThis = this;

    const stakerWhitelistedCacheObj = new StakerWhitelistedAddressCache({
        tokenId: oThis.tokenId
      }),
      stakerWhitelistedAddrRsp = await stakerWhitelistedCacheObj.fetch();

    if (stakerWhitelistedAddrRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_smm_b_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.gatewayComposer = stakerWhitelistedAddrRsp.data.gatewayComposerAddress;
  }

  /**
   *
   * @private
   *
   * @return {Object}
   *
   */
  get _customSubmitTxParams() {
    throw 'if a sub class calls performTransaction, it needs to implement this and return custom sub mit tx params';
  }
}

module.exports = Base;
