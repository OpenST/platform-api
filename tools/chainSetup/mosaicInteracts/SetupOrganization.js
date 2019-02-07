'use strict';

/**
 * setup organization class
 *
 * @module /tools/chainSetup/mosaicInteracts/SetupOrganization
 */
const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  Base = require(rootPrefix + '/tools/chainSetup/mosaicInteracts/Base'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  MosaicTbd = require('@openstfoundation/mosaic-tbd');

/**
 *
 * @class
 */
class SetupOrganization extends Base {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Number} params.chainId - chain id on which this is to be performed
   * @param {String} params.signerAddress - address who signs Tx
   * @param {String} params.chainEndpoint - url to connect to chain
   * @param {String} params.gasPrice -  gas price to use
   * @param {String} params.ownerAddress - address which would become owner of this organization contract
   * @param {String} params.adminAddress - address which would become admin of this organization contract
   * @param {Array<String>} params.workerAddresses - whitelisted worker addresses of this organization contract
   * @param {Number} params.gas: required gas for tx
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.ownerAddress = params['ownerAddress'];
    oThis.adminAddress = params['adminAddress'];
    oThis.workerAddresses = params['workerAddresses'];

    oThis.expirationHeight = contractConstants.organizationExpirationHeight;
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

    let deployParams = {
      gasPrice: oThis.gasPrice,
      from: oThis.signerAddress,
      nonce: nonceRsp.data['nonce'],
      chainId: oThis.chainId,
      gas: oThis.gas
    };

    let orgHelperObj = new SetupOrganization.OrganizationHelper(oThis._web3Instance),
      deployRsp = await orgHelperObj
        .deploy(oThis.ownerAddress, oThis.adminAddress, oThis.workerAddresses, oThis.expirationHeight, deployParams)
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
          return Promise.reject(
            responseHelper.error({
              internal_error_identifier: 't_cs_so_1',
              api_error_identifier: 'unhandled_catch_response',
              debug_options: {}
            })
          );
        });

    oThis._removeKeyFromWallet(signerKey);

    return Promise.resolve(deployRsp);
  }

  static get OrganizationHelper() {
    return MosaicTbd.ChainSetup.OrganizationHelper;
  }
}

module.exports = SetupOrganization;
