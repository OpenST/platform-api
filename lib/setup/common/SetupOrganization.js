'use strict';

/**
 * setup organization class
 *
 * @module tools/chainSetup/common/SetupOrganization
 */
const MosaicTbd = require('@openstfoundation/mosaic-tbd');

const rootPrefix = '../../..',
  CommonSetupBase = require(rootPrefix + '/lib/setup/common/Base'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain');

/**
 *
 * @class
 */
class SetupOrganization extends CommonSetupBase {
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
   * @param {Object} params.pendingTransactionExtraData - pending tx extra data
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

    let txOptions = {
      gasPrice: oThis.gasPrice,
      gas: contractConstants.setupOrganizationGas,
      from: oThis.signerAddress,
      value: contractConstants.zeroValue
    };

    let orgHelperObj = new SetupOrganization.OrganizationHelper(),
      txObject = await orgHelperObj._deployRawTx(
        oThis.ownerAddress,
        oThis.adminAddress,
        oThis.workerAddresses,
        oThis.expirationHeight,
        txOptions,
        oThis._web3Instance
      );

    txOptions['data'] = txObject.encodeABI();

    let submitTxRsp = await new SubmitTransaction({
      chainId: oThis.chainId,
      provider: oThis.chainEndpoint,
      txOptions: txOptions,
      options: oThis.pendingTransactionExtraData
    }).perform();

    return Promise.resolve(submitTxRsp);
  }

  static get OrganizationHelper() {
    return MosaicTbd.ChainSetup.OrganizationHelper;
  }
}

module.exports = SetupOrganization;
