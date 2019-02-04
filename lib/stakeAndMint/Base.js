'use strict';

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  StakerWhitelistedAddressModel = require(rootPrefix + '/app/models/mysql/StakerWhitelistedAddress'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

class Base {
  constructor(params) {
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
   * perform
   *
   * @return {Promise|*|Promise<T>}
   */
  perform(payloadDetails) {
    const oThis = this;

    // pending tx payload
    oThis.payloadDetails = payloadDetails;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error(`${__filename}::perform::catch`);
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'l_smm_b_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
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

    let response = await chainConfigProvider.getFor([oThis.originChainId]);

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

    let response = await chainConfigProvider.getFor([oThis.auxChainId]);

    oThis.auxChainConfig = response[oThis.auxChainId];
    oThis.auxWsProviders = oThis.auxChainConfig.auxGeth.readWrite.wsProviders;
    oThis.auxWeb3 = web3Provider.getInstance(oThis.auxWsProviders[0]).web3WsProvider;
  }

  /**
   * performTransaction
   *
   * @return {Promise<void>}
   */
  async performTransaction(chainId, wsProvider, from, to, data) {
    const oThis = this;

    let gasPrice = contractConstants.auxChainGasPrice;
    if (oThis.originChainId == chainId) {
      gasPrice = contractConstants.defaultOriginChainGasPrice;
    }

    let txOptions = {
      gasPrice: gasPrice,
      gas: '5000000',
      value: '0x0',
      from: from,
      to: to,
      data: data
    };

    let submitTransactionObj = new SubmitTransaction({
      chainId: chainId,
      txOptions: txOptions,
      provider: wsProvider,
      options: oThis.payloadDetails
    });

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

    let stakerWhitelistedAddressObj = new StakerWhitelistedAddressModel();

    let response = await stakerWhitelistedAddressObj.fetchAddress({
      tokenId: oThis.tokenId,
      stakerAddress: oThis.stakerAddress
    });

    oThis.gatewayComposer = response.data.gatewayComposerAddress;
  }
}

module.exports = Base;
