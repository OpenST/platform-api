'use strict';

/*
 * This file helps in performing stake
 *
 * lib/stakeMintManagement/Stake.js
 */

const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  contractHelper = require(rootPrefix + '/helpers/contractHelper'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/signSubmitTrxOnChain'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  Mosaic = require('@openstfoundation/mosaic-tbd');

class Stake {
  constructor(params) {
    const oThis = this;

    oThis.originChainId = params.originChainId;
    oThis.auxChainId = params.auxChainId;
    oThis.amount = params.amount;
    oThis.beneficiary = params.beneficiary;
    oThis.stakerAddress = params.stakerAddress;
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
          internal_error_identifier: 'l_smm_s_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * _asyncPerform
   *
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._setWeb3Instance();

    await oThis._validateStakerAddress();

    await oThis._fetchGatewayContractAddress();

    await oThis._getStakerNonceFromGateway();

    await oThis._getHashLock();

    await oThis._performStake();
  }

  /**
   * _setWeb3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.originChainId]);

    oThis.originChainConfig = response[oThis.originChainId];
    oThis.wsProviders = oThis.originChainConfig.originGeth.readWrite.wsProviders;
    oThis.web3 = web3Provider.getInstance(oThis.wsProviders[0]).web3WsProvider;
  }

  /**
   * _validateStakerAddress - Validate staker address
   *
   * @return {Promise<void>}
   * @private
   */
  async _validateStakerAddress() {
    const oThis = this;

    if (!oThis.stakerAddress) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_smm_s_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: { stakerAddress: oThis.stakerAddress }
        })
      );
    }
  }

  /***
   *
   * Fetch Gateway contract address
   *
   * @return {object}
   */
  async _fetchGatewayContractAddress() {
    const oThis = this;

    let resp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.originChainId,
      auxChainId: oThis.auxChainId,
      kind: chainAddressConstants.originGatewayContractKind
    });

    if (resp.isSuccess()) {
      oThis.gatewayContractAddress = resp.data.address;
    }
  }

  /**
   * _getStakerNonceFromGateway
   *
   * @return {Promise<void>}
   * @private
   */
  async _getStakerNonceFromGateway() {
    const oThis = this;

    oThis.gatewayContractObject = await contractHelper.getMosaicTbdContractObj(
      oThis.web3,
      'EIP20Gateway',
      oThis.gatewayContractAddress
    );

    oThis.stakerNonce = await oThis.gatewayContractObject.methods.getNonce(oThis.stakerAddress).call({});
  }

  /**
   * _getHashLock
   *
   * @return {Promise<void>}
   * @private
   */
  async _getHashLock() {
    const oThis = this;

    let response = Mosaic.Helpers.StakeHelper.createSecretHashLock();

    oThis.hashLock = response.hashLock;
  }

  /**
   * _performStake - Invoke stake
   *
   * @return {Promise<void>}
   * @private
   */
  async _performStake() {
    const oThis = this;

    let gasPrice = '0';

    let data = await oThis.gatewayContractObject.methods
      .stake(
        oThis.amount,
        oThis.beneficiary,
        gasPrice,
        coreConstants.OST_ORIGIN_GAS_LIMIT,
        oThis.stakerNonce,
        oThis.hashLock
      )
      .encodeABI();

    let txOptions = {
      gasPrice: '0',
      gas: '5000000',
      value: '0',
      from: oThis.stakerAddress,
      to: oThis.gatewayContractAddress,
      data: data
    };

    let submitTransactionObj = new SubmitTransaction({
      chainId: oThis.originChainId,
      txOptions: txOptions,
      provider: oThis.wsProviders[0]
    });

    return submitTransactionObj.perform();
  }
}

module.exports = Stake;
