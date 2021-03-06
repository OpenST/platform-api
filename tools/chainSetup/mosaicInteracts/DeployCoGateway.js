'use strict';

/**
 * deploy CoGateway contract on origin class
 *
 * @module /tools/chainSetup/mosaicInteracts/DeployCoGateway
 */
const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  Base = require(rootPrefix + '/tools/chainSetup/mosaicInteracts/Base'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  MosaicJs = require('@openst/mosaic.js');

/**
 *
 * @class
 */
class DeployCoGateway extends Base {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Number} params.chainId - chain id on which this is to be performed
   * @param {String} params.signerAddress - address who signs Tx
   * @param {String} params.chainEndpoint - url to connect to chain
   * @param {String} params.gasPrice -  gas price to use
   * @param {String} params.originContractAddress - The ERC20 token contract address that will be staked
   * @param {String} params.auxContractAddress - SPrime / BT contract address from aux chain
   * @param {String} params.gatewayAddress - gateway address
   * @param {String} params.anchorAddress - anchor address
   * @param {String} params.organizationAddress - organization address
   * @param {String} params.messageBusLibAddress
   * @param {String} params.gatewayLibAddress
   * @param {Number} params.gas: required gas for tx
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.originContractAddress = params['originContractAddress'];
    oThis.auxContractAddress = params['auxContractAddress'];
    oThis.anchorAddress = params['anchorAddress'];
    oThis.gatewayAddress = params['gatewayAddress'];
    oThis.organizationAddress = params['organizationAddress'];
    oThis.messageBusLibAddress = params['messageBusLibAddress'];
    oThis.gatewayLibAddress = params['gatewayLibAddress'];

    oThis.bounty = contractConstants.bountyForCoGateway;
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
      chainId: oThis.chainId,
      gas: oThis.gas
    };

    let helperObj = new DeployCoGateway.CoGatewayHelper(oThis._web3Instance),
      deployRsp = await helperObj
        .deploy(
          oThis.originContractAddress,
          oThis.auxContractAddress,
          oThis.anchorAddress,
          oThis.bounty,
          oThis.organizationAddress,
          oThis.gatewayAddress,
          oThis.messageBusLibAddress,
          oThis.gatewayLibAddress,
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
            internal_error_identifier: 't_cos_dcg_1',
            api_error_identifier: 'unhandled_catch_response',
            debug_options: {}
          });
        });

    oThis._removeKeyFromWallet(signerKey);

    return Promise.resolve(deployRsp);
  }

  static get CoGatewayHelper() {
    return MosaicJs.ChainSetup.CoGatewayHelper;
  }
}

module.exports = DeployCoGateway;
