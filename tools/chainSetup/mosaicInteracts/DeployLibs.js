'use strict';
/**
 * Deploy libs
 *
 * @module /tools/chainSetup/mosaicInteracts/DeployLibs
 */
const MosaicJs = require('@openstfoundation/mosaic.js');

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  Base = require(rootPrefix + '/tools/chainSetup/mosaicInteracts/Base');

/**
 * Class for deploying libs.
 *
 * @class
 */
class DeployLibs extends Base {
  /**
   * Constructor for deploying libs.
   *
   * @param {Object} params
   * @param {String} params.libKind - type of lib to be deployed
   * @param {Number} params.chainId - chain id on which this is to be performed
   * @param {String} params.signerAddress - address who signs Tx
   * @param {String} params.chainEndpoint - url to connect to chain
   * @param {String} params.gasPrice -  gas price to use
   * @param {String} [params.merklePatriciaProofAddress] - merklePatriciaProof lib address
   * @param {Number} params.gas: required gas for tx
   *
   * @constructor
   */
  constructor(params) {
    super(params);
    const oThis = this;
    oThis.libKind = params['libKind'];
    oThis.merklePatriciaProofAddress = params['merklePatriciaProofAddress'];
  }

  /**
   *
   * @return {Promise<result>}
   *
   */
  async _asyncPerform() {
    const oThis = this;

    let signerKey = await oThis._fetchSignerKey();

    oThis._addKeyToWallet(signerKey);

    let deployRsp = await oThis
      ._deployLib()
      .then(function(txReceipt) {
        return responseHelper.successWithData({
          transactionReceipt: txReceipt,
          transactionHash: txReceipt.transactionHash,
          contractAddress: txReceipt.contractAddress
        });
      })
      .catch(function(errorResponse) {
        logger.error(errorResponse);
        return responseHelper.error({
          internal_error_identifier: 't_cs_mi_dl_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      });

    oThis._removeKeyFromWallet(signerKey);

    return Promise.resolve(deployRsp);
  }

  /***
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _deployLib() {
    const oThis = this;

    let nonceRsp = await oThis._fetchNonce(),
      txOptions = {
        gasPrice: oThis.gasPrice,
        from: oThis.signerAddress,
        nonce: nonceRsp.data['nonce'],
        chainId: oThis.chainId,
        gas: oThis.gas
      };

    let libsHelperObj = new DeployLibs.LibsHelper(oThis._web3Instance);

    switch (oThis.libKind) {
      case 'merklePatriciaProof':
        return libsHelperObj.deployMerklePatriciaProof(txOptions);
      case 'messageBus':
        return libsHelperObj.deployMessageBus(oThis.merklePatriciaProofAddress, txOptions);
      case 'gateway':
        return libsHelperObj.deployGatewayLib(oThis.merklePatriciaProofAddress, txOptions);
      default:
        throw `unsupported libLind ${oThis.libKind}`;
    }
  }

  static get LibsHelper() {
    return MosaicJs.ChainSetup.LibsHelper;
  }
}

module.exports = DeployLibs;
