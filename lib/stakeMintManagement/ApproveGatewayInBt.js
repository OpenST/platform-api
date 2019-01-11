'use strict';

/*
 *  Module would help in Approving Gateway contract in Simple Token for Stake amount.
 *
 *  @module lib/stakeMintManagement/ApproveGatewayInBt.js
 */

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  submitTransaction = require(rootPrefix + '/lib/transactions/signSubmitTrxOnChain'),
  contractHelper = require(rootPrefix + '/helpers/contractHelper');

class ApproveGatewayInBt {
  constructor(params) {
    const oThis = this;

    oThis.originChainId = params.originChainId;
    oThis.auxChainId = params.auxChainId;
    oThis.stakerAddress = params.stakerAddress;
    oThis.amountToStake = params.amountToStake;
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
          internal_error_identifier: 'l_smm_agib_1',
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

    await oThis._fetchContractAddresses();
    // If contract addresses are not found
    if (!oThis.gatewayContractAddress || !oThis.simpleTokenContract) {
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_smm_agib_2',
          api_error_identifier: 'contract_not_found',
          debug_options: {}
        })
      );
    }

    await oThis._setWeb3Instance();

    let resp = await oThis._sendApproveTransaction();

    return resp;
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
   * _fetchGatewayAddress
   *
   * @return {Promise<never>}
   * @private
   */
  async _fetchContractAddresses() {
    const oThis = this;

    await oThis._fetchGatewayContractAddress();

    await oThis._fetchSimpleTokenContractAddress();
  }

  /**
   * Send approve transaction
   *
   * @return {Promise<void>}
   * @private
   */
  async _sendApproveTransaction() {
    const oThis = this;

    let contractObject = await contractHelper.getMosaicTbdContractObj(
      oThis.web3,
      'EIP20Token',
      oThis.simpleTokenContract
    );

    let data = contractObject.methods.approve(oThis.gatewayContractAddress, oThis.amountToStake).encodeABI();

    let txOptions = {
      gasPrice: '0x0',
      gas: '1000000',
      value: '0x00',
      from: oThis.stakerAddress,
      to: oThis.simpleTokenContract,
      data: data
    };

    return new submitTransaction({
      chainId: oThis.originChainId,
      txOptions: txOptions,
      provider: oThis.wsProviders[0]
    }).perform();
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

  /***
   *
   * Fetch simple token contract address
   *
   * @return {object}
   */
  async _fetchSimpleTokenContractAddress() {
    const oThis = this;

    let resp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.originChainId,
      kind: chainAddressConstants.baseContractKind
    });

    if (resp.isSuccess()) {
      oThis.simpleTokenContract = resp.data.address;
    }
  }
}

module.exports = ApproveGatewayInBt;
