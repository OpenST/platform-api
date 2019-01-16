'use strict';

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  util = require(rootPrefix + '/lib/util'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

class Base {
  constructor(params) {
    const oThis = this;

    oThis._fillParams(params);
  }

  /**
   * perform
   *
   * @return {Promise|*|Promise<T>}
   */
  perform() {
    const oThis = this;

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
   * _fillParams
   *
   * @param params
   * @private
   */
  _fillParams(params) {
    const oThis = this;

    for (let key in params) {
      oThis[key] = params[key];
    }
  }

  /**
   * _addressKindsToFetch
   *
   * @private
   */
  _addressKindsToFetch() {
    const oThis = this;

    throw 'Base class to implement';
  }

  /**
   * _fetchContractAddresses
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchContractAddresses() {
    const oThis = this;

    let chainKindToAddressKindsMap = oThis._addressKindsToFetch();

    for (let chainKind in chainKindToAddressKindsMap) {
      let addressKinds = chainKindToAddressKindsMap[chainKind],
        chainId = chainKind == 'aux' ? oThis.auxChainId : oThis.originChainId,
        auxChainId = chainKind == 'aux' ? oThis.auxChainId : null;

      for (let i = 0; i < addressKinds.length; i++) {
        let params = {
          chainId: chainId,
          kind: addressKinds[i]
        };

        if (auxChainId) params['auxChainId'] = auxChainId;

        let resp = await new ChainAddressModel().fetchAddress(params);

        if (resp.isSuccess()) {
          let addressString = addressKinds[i];
          oThis[addressString] = resp.data.address;
        }
      }
    }
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

    let txOptions = {
      gasPrice: '0',
      gas: '5000000',
      value: '0',
      from: from,
      to: to,
      data: data
    };

    let submitTransactionObj = new SubmitTransaction({
      chainId: chainId,
      txOptions: txOptions,
      provider: wsProvider
    });

    return submitTransactionObj.perform();
  }
}

module.exports = Base;
