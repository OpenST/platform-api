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
  Base = require(rootPrefix + '/tools/chainSetup/mosaicInteracts/Base'),
  web3Provider = require(rootPrefix + '/lib/providers/web3');

/**
 *
 * @class
 */
class DeployAnchor extends Base {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Number} params.chainId - chain id on which Anchor is to be deployed
   * @param {Number} params.remoteChainId - chain id of the remote chain, whose state root is to be committed
   * @param {String} params.signerAddress - address who deploys Anchor
   * @param {String} params.chainEndpoint - url to connect to chain on which deployment is to be done
   * @param {String} params.remoteChainEndpoint - remote chain endpoint
   * @param {String} params.gasPrice -  gas price to use
   * @param {String} params.organizationAddress - organization contract address for this contract, deployed on chain id
   * @param {Number} params.gas: required gas for tx
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.remoteChainEndpoint = params.remoteChainEndpoint;
    oThis.remoteChainId = params.remoteChainId;
    oThis.organizationAddress = params.organizationAddress;

    oThis.maxStateRoots = 100;

    oThis.remoteChainLatestBlock = null;
  }

  /**
   * Async Perform
   *
   * @return {Promise<any>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._fetchRemoteChainLatestBlock();

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

    let anchorHelperObj = new MosaicJs.ChainSetup.AnchorHelper(oThis._web3Instance),
      deployRsp = await anchorHelperObj
        .deploy(
          oThis.remoteChainId,
          oThis.remoteChainLatestBlock.number,
          oThis.remoteChainLatestBlock.stateRoot,
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

  /**
   * Fetch remote chain latest block from remote chain
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchRemoteChainLatestBlock() {
    const oThis = this;

    let remoteChainWeb3Instance = web3Provider.getInstance(oThis.remoteChainEndpoint).web3WsProvider;

    oThis.remoteChainLatestBlock = await remoteChainWeb3Instance.eth.getBlock('latest');
  }
}

module.exports = DeployAnchor;
