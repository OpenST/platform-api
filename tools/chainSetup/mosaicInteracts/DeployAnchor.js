'use strict';
/**
 * Deploy anchor contract class
 *
 * @module /tools/chainSetup/mosaicInteracts/DeployAnchor
 */

const MosaicJs = require('@openst/mosaic.js');

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  Base = require(rootPrefix + '/tools/chainSetup/mosaicInteracts/Base');

/**
 *
 * @class
 */
class DeployAnchor extends Base {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Number} params.chainId - chain id on which this is to be performed
   * @param {String} params.signerAddress - address who signs Tx
   * @param {String} params.chainEndpoint - url to connect to chain
   * @param {String} params.gasPrice -  gas price to use
   * @param {String} params.organizationAddress - organization address for this contract
   * @param {Number} params.gas: required gas for tx
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.organizationAddress = params['organizationAddress'];

    oThis.maxStateRoots = 100; //TODO: Change later

    oThis.latestBlock = null;
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

    await oThis._fetchLatestBlock();

    let nonceRsp = await oThis._fetchNonce(),
      signerKey = await oThis._fetchSignerKey();

    oThis._addKeyToWallet(signerKey);

    let txOptions = {
      gasPrice: oThis.gasPrice,
      from: oThis.signerAddress,
      nonce: nonceRsp.data['nonce'],
      chainId: oThis.chainId,
      gas: oThis.gas
    };

    logger.debug('txOptions-------', txOptions);

    let anchorHelperObj = new DeployAnchor.AnchorHelper(oThis._web3Instance),
      deployRsp = await anchorHelperObj
        .deploy(
          oThis.remoteChainId,
          oThis.latestBlock.number,
          oThis.latestBlock.stateRoot,
          oThis.maxStateRoots,
          oThis.organizationAddress,
          txOptions
        )
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
            internal_error_identifier: 't_cos_da_1',
            api_error_identifier: 'unhandled_catch_response',
            debug_options: {}
          });
        });

    oThis._removeKeyFromWallet(signerKey);

    return Promise.resolve(deployRsp);
  }

  /***
   *
   * @private
   */
  async _fetchLatestBlock() {
    const oThis = this;
    oThis.latestBlock = await oThis._web3Instance.eth.getBlock('latest');
  }

  static get AnchorHelper() {
    return MosaicJs.ChainSetup.AnchorHelper;
  }
}

module.exports = DeployAnchor;
