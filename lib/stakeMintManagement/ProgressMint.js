'use strict';

/*
 * This class file helps in progressing mint in co-gateway
 */

const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/signSubmitTrxOnChain');

const MosaicFacilitator = require('@openstfoundation/mosaic-facilitator.js');

class ProgressMint {
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.coGatewayContractAddress = params.coGatewayContractAddress;
    oThis.facilitator = params.facilitator;
    oThis.stakeMessageHash = params.stakeMessageHash;
    oThis.unlockSecret = params.unlockSecret;
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
          internal_error_identifier: 'l_smm_pm_1',
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

    await oThis._performProgressMint();
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
   * _performProgressMint
   *
   * @return {Promise<void>}
   * @private
   */
  async _performProgressMint() {
    const oThis = this;

    let gasPrice = '0';

    let mosaicFacilitator = new MosaicFacilitator.Helpers.coGateway({
      contractAddress: oThis.coGatewayContractAddress
    });

    let data = mosaicFacilitator.progressMint(oThis.stakeMessageHash, oThis.unlockSecret).encodeABI();

    let txOptions = {
      gasPrice: gasPrice,
      gas: '5000000',
      value: '0',
      from: oThis.facilitator,
      to: oThis.coGatewayContractAddress,
      data: data
    };

    let submitTransactionObj = new SubmitTransaction({
      chainId: oThis.auxChainId,
      txOptions: txOptions,
      provider: oThis.wsProviders[0]
    });

    return submitTransactionObj.perform();
  }
}

module.exports = ProgressMint;
