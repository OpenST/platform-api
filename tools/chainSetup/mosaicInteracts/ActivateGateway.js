'use strict';

/**
 * activate Gateway contract on origin class
 *
 * @module tools/chainSetup/mosaicInteracts/ActivateGateway
 */
const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  Base = require(rootPrefix + '/tools/chainSetup/mosaicInteracts/Base'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  MosaicTbd = require('@openstfoundation/mosaic-tbd');

/**
 *
 * @class
 */
class ActivateGateway extends Base {
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
   * @param {Number} params.gas: required gas for tx
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

    let nonceRsp = await oThis._fetchNonce(),
      signerKey = await oThis._fetchSignerKey();

    oThis._addKeyToWallet(signerKey);

    let txOptions = {
      gasPrice: oThis.gasPrice,
      from: oThis.signerAddress,
      nonce: nonceRsp.data['nonce'],
      gas: oThis.gas
    };

    let helperObj = new ActivateGateway.GatewayHelper(oThis._web3Instance),
      deployRsp = await helperObj
        .activateGateway(oThis.coGatewayAddress, txOptions, oThis.gatewayAddress)
        .then(function(txReceipt) {
          logger.debug('txReceipt', txReceipt);
          return responseHelper.successWithData({
            transactionReceipt: txReceipt,
            transactionHash: txReceipt.transactionHash,
            contractAddress: txReceipt.contractAddress
          });
        })
        .catch(function(errorResponse) {
          logger.error(errorResponse);
          return responseHelper.error({
            internal_error_identifier: 't_cos_ag_1',
            api_error_identifier: 'unhandled_catch_response',
            debug_options: {}
          });
        });

    oThis._removeKeyFromWallet(signerKey);

    return Promise.resolve(deployRsp);
  }

  static get GatewayHelper() {
    return MosaicTbd.ChainSetup.GatewayHelper;
  }
}

module.exports = ActivateGateway;
