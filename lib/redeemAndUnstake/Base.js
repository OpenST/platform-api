const Crypto = require('crypto'),
  web3Utils = require('web3-utils');

const rootPrefix = '../..',
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain');

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

    oThis.shuffledProviders = {};
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
        internal_error_identifier: 'l_rau_b_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    });
  }

  /**
   * _setOriginWeb3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setOriginWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.originChainId]);

    oThis.originChainConfig = response[oThis.originChainId];
    oThis.originWsProviders = oThis.originChainConfig.originGeth.readWrite.wsProviders;

    oThis.shuffledProviders[oThis.originChainId] = [];
    oThis.shuffledProviders[oThis.originChainId] = basicHelper.shuffleArray(oThis.originWsProviders);

    oThis.originWeb3 = web3Provider.getInstance(oThis.shuffledProviders[oThis.originChainId][0]).web3WsProvider;
  }

  /**
   * _setAuxWeb3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setAuxWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.auxChainId]);

    oThis.auxChainConfig = response[oThis.auxChainId];
    oThis.auxWsProviders = oThis.auxChainConfig.auxGeth.readWrite.wsProviders;

    oThis.shuffledProviders[oThis.auxChainId] = [];
    oThis.shuffledProviders[oThis.auxChainId] = basicHelper.shuffleArray(oThis.auxWsProviders);

    oThis.auxWeb3 = web3Provider.getInstance(oThis.shuffledProviders[oThis.auxChainId][0]).web3WsProvider;
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
      value: '0x0',
      from: from,
      to: to,
      data: data
    };

    if (txOptions) {
      Object.assign(defaultOptions, txOptions);
    }
    txOptions = defaultOptions;

    const submitTransactionObj = new SubmitTransaction({
      chainId: chainId,
      txOptions: txOptions,
      provider: wsProvider,
      options: oThis.payloadDetails
    });

    return submitTransactionObj.perform();
  }

  /**
   * Get secret hash lock
   *
   * @param secretString
   * @returns {{secret: *, hashLock: *}}
   */
  getSecretHashLock(secretString) {
    if (!secretString) {
      secretString = Crypto.randomBytes(16).toString('hex');
    }
    return {
      secret: secretString,
      hashLock: web3Utils.keccak256(secretString)
    };
  }
}

module.exports = Base;
