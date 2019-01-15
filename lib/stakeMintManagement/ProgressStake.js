'use strict';

/*
 * This class file helps in progressing stake in gateway
 */

const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/signSubmitTrxOnChain');

const MosaicFacilitator = require('@openstfoundation/mosaic-facilitator.js');

class ProgressStake {
  constructor(params) {
    const oThis = this;

    oThis.gatewayContractAddress = params.gatewayContractAddress;
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
          internal_error_identifier: 'l_smm_ps_1',
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
   * _performProgressStake
   *
   * @return {Promise<void>}
   * @private
   */
  async _performProgressStake() {
    const oThis = this;

    let gasPrice = '0';

    let mosaicFacilitator = new MosaicFacilitator.Helpers.Gateway({
      contractAddress: oThis.gatewayContractAddress
    });

    let data = mosaicFacilitator.progressStake(oThis.stakeMessageHash, oThis.unlockSecret).encodeABI();

    let txOptions = {
      gasPrice: gasPrice,
      gas: '5000000',
      value: '0',
      from: oThis.facilitator,
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

module.exports = ProgressStake;
