'use strict';

/**
 * set co anchor contract class
 *
 * @module tools/commonSetup/SetCoAnchor
 */
const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonSetupBase = require(rootPrefix + '/tools/commonSetup/Base'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  MosaicTbd = require('mosaic-tbd');

/**
 *
 * @class
 */
class SetCoAnchor extends CommonSetupBase {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Number} params.chainId - chain id on which this is to be performed
   * @param {String} params.signerAddress - address who signs Tx
   * @param {String} params.chainEndpoint - url to connect to chain
   * @param {String} params.gasPrice -  gas price to use
   * @param {String} params.anchorContractAddress - anchor address for which co anchor is to be set
   * @param {String} params.coAnchorContractAddress - co anchor address to be set
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.anchorContractAddress = params['anchorContractAddress'];
    oThis.coAnchorContractAddress = params['coAnchorContractAddress'];
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
      gas: 4000000,
      gasPrice: oThis.gasPrice,
      from: oThis.signerAddress,
      nonce: nonceRsp.data['nonce'],
      chainId: oThis.chainId
    };

    let anchorHelperObj = new SetCoAnchor.AnchorHelper(oThis._web3Instance),
      deployRsp = await anchorHelperObj
        .setCoAnchorAddress(oThis.coAnchorContractAddress, txOptions, oThis.anchorContractAddress)
        .then(function(txReceipt) {
          logger.debug('txReceipt', txReceipt);
          return responseHelper.successWithData({
            transactionReceipt: txReceipt,
            transactionHash: txReceipt.transactionHash
          });
        })
        .catch(function(errorResponse) {
          logger.error(errorResponse);
          return responseHelper.error({
            internal_error_identifier: 't_cos_sca_1',
            api_error_identifier: 'unhandled_catch_response',
            debug_options: {}
          });
        });

    oThis._removeKeyFromWallet(signerKey);

    return Promise.resolve(deployRsp);
  }

  static get AnchorHelper() {
    return MosaicTbd.ChainSetup.AnchorHelper;
  }
}

module.exports = SetCoAnchor;
