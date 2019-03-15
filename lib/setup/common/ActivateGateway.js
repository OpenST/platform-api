'use strict';

/**
 * activate Gateway contract on origin class
 *
 * @module lib/setup/common/ActivateGateway
 */
const rootPrefix = '../../..',
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  CommonSetupBase = require(rootPrefix + '/lib/setup/common/Base'),
  MosaicJs = require('@openstfoundation/mosaic.js');

/**
 *
 * @class
 */
class ActivateGateway extends CommonSetupBase {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Number} params.chainId - chain id on which this is to be performed
   * @param {String} params.signerAddress - address who signs Tx
   * @param {String} params.chainEndpoint - url to connect to chain
   * @param {String} params.gasPrice -  gas price to use
   * @param {String} params.gatewayAddress - gateway contract address which is to be activated
   * @param {String} params.coGatewayAddress - co gateway contract address (aux chain's gateway contract address)
   * @param {Object} params.pendingTransactionExtraData - pending tx extra data
   * @param {Object} [params.customSubmitTxParams]: custom submit tx params (extra ones to be inserted in tx meta)
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.gatewayAddress = params['gatewayAddress'];
    oThis.coGatewayAddress = params['coGatewayAddress'];
  }

  /**
   *
   * async perform
   *
   * @return {Promise<result>}
   *
   */
  async _asyncPerform() {
    const oThis = this;

    let txOptions = {
      gasPrice: oThis.gasPrice,
      from: oThis.signerAddress,
      to: oThis.gatewayAddress,
      gas: contractConstants.activateGatewayGas,
      value: contractConstants.zeroValue
    };

    // FIXME helperObj._activateGatewayRawTx returns a Promise
    let helperObj = new ActivateGateway.GatewayHelper(),
      txObject = await helperObj._activateGatewayRawTx(
        oThis.coGatewayAddress,
        txOptions,
        oThis.gatewayAddress,
        oThis._web3Instance
      );

    txOptions['data'] = txObject.encodeABI();

    let submitRxParams = {
      chainId: oThis.chainId,
      provider: oThis.chainEndpoint,
      txOptions: txOptions,
      options: oThis.pendingTransactionExtraData
    };

    if (oThis.customSubmitTxParams) {
      Object.assign(submitRxParams, oThis.customSubmitTxParams);
    }

    let submitTxRsp = await new SubmitTransaction(submitRxParams).perform();

    return Promise.resolve(submitTxRsp);
  }

  static get GatewayHelper() {
    return MosaicJs.ChainSetup.GatewayHelper;
  }
}

module.exports = ActivateGateway;
