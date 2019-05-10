/**
 * Module for stake and mint base class.
 *
 * @module lib/stakeAndMint/Base
 */

const rootPrefix = '../..',
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  StakerWhitelistedAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/StakerWhitelistedAddress'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig');

/**
 * Class for stake and mint base class.
 *
 * @class Base
 */
class Base {
  /**
   * Constructor for stake and mint base class.
   *
   * @constructor
   */
  constructor() {
    const oThis = this;

    oThis.payloadDetails = null;
    oThis.gatewayComposer = null;
    oThis.originWeb3 = null;
    oThis.auxShuffledProviders = null;
    oThis.originShuffledProviders = null;
    oThis.auxWeb3 = null;
  }

  /**
   * Main performer for the class.
   *
   * @sets oThis.payloadDetails
   *
   * @param {object} payloadDetails
   *
   * @return {Promise|*|Promise<T>}
   */
  perform(payloadDetails) {
    const oThis = this;

    // Pending tx payload.
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
   * Set web3 instance.
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
   * Set origin web3 instance.
   *
   * @sets oThis.originShuffledProviders, oThis.originWeb3
   *
   * @return {Promise<void>}
   * @private
   */
  async _setOriginWeb3Instance() {
    const oThis = this;

    const response = await chainConfigProvider.getFor([oThis.originChainId]);

    const originChainConfig = response[oThis.originChainId];
    const originWsProviders = originChainConfig.originGeth.readWrite.wsProviders;

    oThis.originShuffledProviders = basicHelper.shuffleArray(originWsProviders);
    oThis.originWeb3 = web3Provider.getInstance(oThis.originShuffledProviders[0]).web3WsProvider;
  }

  /**
   * Set aux web3 instance.
   *
   * @sets oThis.auxShuffledProviders, oThis.auxWeb3
   *
   * @return {Promise<void>}
   * @private
   */
  async _setAuxWeb3Instance() {
    const oThis = this;

    const response = await chainConfigProvider.getFor([oThis.auxChainId]);

    const auxChainConfig = response[oThis.auxChainId];
    const auxWsProviders = auxChainConfig.auxGeth.readWrite.wsProviders;

    oThis.auxShuffledProviders = basicHelper.shuffleArray(auxWsProviders);
    oThis.auxWeb3 = web3Provider.getInstance(oThis.auxShuffledProviders[0]).web3WsProvider;
  }

  /**
   * Perform transaction, create entry in pending transactions.
   *
   * @param {number} chainId
   * @param {string} wsProvider
   * @param {string} from
   * @param {string} to
   * @param {object} txOptions
   * @param {object} data
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

    const submitTxParams = {
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
   * Fetch staker gateway composer.
   *
   * @sets oThis.gatewayComposer
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
   * Get submit transaction parameters.
   *
   * @return {object}
   * @private
   */
  get _customSubmitTxParams() {
    throw new Error(
      'If a sub class calls performTransaction, it needs to implement this and return custom submit tx params.'
    );
  }
}

module.exports = Base;
