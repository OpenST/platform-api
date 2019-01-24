'use strict';

/**
 *  @module lib/fund/oStPrime/Base
 *
 *  This class fund ost prime.
 */

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

class FundOstPrimeBase {
  /**
   * Constructor to deploy token organization
   *
   * @param {Object} params
   * @param {Object} params.pendingTransactionExtraData: pending tx extra data
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.pendingTransactionExtraData = params.pendingTransactionExtraData;

    oThis.chainId = null;
    oThis.chainEndpoint = null;

    oThis.gas = null;
    oThis.gasPrice = null;
    oThis.fromAddress = null;
    oThis.toAddress = null;
    oThis.transferValueInWei = null;
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
          internal_error_identifier: 'f_ostp_b_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * _asyncPerform
   *
   * @return {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._initializeVars();

    await oThis._setWeb3Instance();

    await oThis._setAddresses();

    await oThis._setTransferValueInWei();

    let txOptions = await oThis._setRawTx();

    let submitTxRsp = await new SubmitTransaction({
      chainId: oThis.chainId,
      provider: oThis.chainEndpoint,
      txOptions: txOptions,
      options: oThis.pendingTransactionExtraData
    }).perform();

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskPending,
        transactionHash: submitTxRsp.data['transactionHash'],
        taskResponseData: txOptions
      })
    );
  }

  /***
   *
   */
  _initializeVars() {
    const oThis = this;

    oThis.chainId = oThis._configStrategyObject.auxChainId;
    oThis.chainEndpoint = oThis._configStrategyObject.chainWsProvider(oThis.chainId, 'readWrite');
    oThis.gasPrice = contractConstants.auxChainGasPrice;
    oThis.gas = contractConstants.transferOstPrimeGas;
  }

  /**
   * _setWeb3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;
    oThis.web3Instance = web3Provider.getInstance(oThis.chainEndpoint).web3WsProvider;
  }

  /***
   *
   * config strategy
   *
   * @return {object}
   */
  get _configStrategy() {
    const oThis = this;
    return oThis.ic().configStrategy;
  }

  /***
   *
   * object of config strategy klass
   *
   * @return {object}
   */
  get _configStrategyObject() {
    const oThis = this;
    if (oThis.configStrategyObj) return oThis.configStrategyObj;
    oThis.configStrategyObj = new ConfigStrategyObject(oThis._configStrategy);
    return oThis.configStrategyObj;
  }

  /***
   *
   * sub classes to implement this method to return raw tx object which would be sent
   *
   * @private
   */
  _setRawTx() {
    const oThis = this;
    return {
      from: oThis.fromAddress,
      to: oThis.toAddress,
      value: oThis.transferValueInWei,
      gas: oThis.gas,
      gasPrice: oThis.gasPrice
    };
  }

  /***
   *
   * @return {Promise<String>}
   * @private
   */
  async _getChainOwnerAddress() {
    const oThis = this;

    let chainOwnerAddressRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis._configStrategyObject.auxChainId,
      kind: chainAddressConstants.ownerKind
    });

    return chainOwnerAddressRsp.data.address;
  }

  /***
   *
   * sub classes to implement this method to set transfer value in wei
   *
   * @private
   */
  _setTransferValueInWei() {
    throw 'sub class to implement';
  }

  /***
   *
   * sub classes to implement this method to set addresses
   *
   * @private
   */
  _setAddresses() {
    throw 'sub class to implement';
  }
}

module.exports = FundOstPrimeBase;
