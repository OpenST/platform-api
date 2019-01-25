'use strict';

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  minBalances = require(rootPrefix + '/lib/fund/MinBalances'),
  currencyConstants = require(rootPrefix + '/lib/globalConstant/currencies'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  chainAddressConst = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  BigNumber = require('bignumber.js');

class Base {
  /**
   * @constructor
   *
   * @param params
   * @param params.auxChainId      {Number}
   * @param params.originChainId   {Number}
   * @param params.fromAddress     {String} - Address from which fund transfer is to be done
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.originChainId = params.originChainId;
    oThis.fromAddress = params.fromAddress;
    oThis.gas = null;
    oThis.gasPrice = null;
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
          internal_error_identifier: 'l_f_e_b_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * setWeb3Instance
   *
   * @return {Promise<void>}
   */
  async setWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.originChainId]);

    oThis.originChainConfig = response[oThis.originChainId];
    oThis.originWsProviders = oThis.originChainConfig.originGeth.readWrite.wsProviders;
    oThis.originWeb3 = web3Provider.getInstance(oThis.originWsProviders[0]).web3WsProvider;
  }

  /**
   * fetchAddresses
   *
   * @return {Promise<void>}
   */
  async fetchAddresses() {
    const oThis = this;

    let chainAddressObj = new ChainAddressModel();

    oThis.addresses = {};

    for (let addressKind in minBalances[currencyConstants.eth]) {
      let params = {
        chainId: oThis.originChainId,
        kind: addressKind
      };

      if (chainAddressConst.pairAddressKinds.includes(addressKind)) {
        params['auxChainId'] = oThis.auxChainId;
      }

      let fetchAddrRsp = await chainAddressObj.fetchAddress(params);

      if (!fetchAddrRsp.data.address) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'l_f_e_b_2',
            api_error_identifier: 'something_went_wrong'
          })
        );
      }

      oThis.addresses[addressKind] = fetchAddrRsp.data.address;
    }
  }

  /**
   * fetchBalances
   *
   * @return {Promise<void>}
   */
  async fetchBalances() {
    const oThis = this;

    oThis.balances = {};

    for (let addressKind in oThis.addresses) {
      let address = oThis.addresses[addressKind];

      let balance = await oThis.originWeb3.eth.getBalance(address);

      oThis.balances[addressKind] = balance;
    }
  }

  /**
   * fundAddresses
   *
   * @return {Promise<void>}
   */
  async fundAddresses() {
    const oThis = this;

    let differenceAmounts = {};

    for (let addressKind in minBalances[currencyConstants.eth]) {
      let minBalance = minBalances[currencyConstants.eth][addressKind];
      let actualBalance = oThis.balances[addressKind];

      let minBalanceBN = new BigNumber(minBalance),
        actualBalanceBN = new BigNumber(actualBalance);

      if (minBalanceBN.gt(actualBalanceBN)) {
        differenceAmounts[addressKind] = minBalanceBN.minus(actualBalanceBN).toString(10);
      }
    }

    for (let addressKind in differenceAmounts) {
      let txOptions = {
        from: oThis.fromAddress,
        to: oThis.addresses[addressKind],
        value: differenceAmounts[addressKind],
        gas: oThis.gas,
        gasPrice: oThis.gasPrice
      };

      // TODO: Accept options if this works with workflow
      let submitTxRsp = await new SubmitTransaction({
        chainId: oThis.originChainId,
        provider: oThis.originWsProviders[0],
        txOptions: txOptions,
        options: {}
      }).perform();

      logger.info('===Submitted transaction', submitTxRsp.data['transactionHash'], 'for address', txOptions.to);
    }
  }
}
