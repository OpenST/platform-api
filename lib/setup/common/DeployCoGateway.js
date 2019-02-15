'use strict';

/**
 * deploy CoGateway contract on origin class
 *
 * @module lib/setup/common/DeployCoGateway
 */

const MosaicJs = require('@openstfoundation/mosaic.js');

const rootPrefix = '../../..',
  CommonSetupBase = require(rootPrefix + '/lib/setup/common/Base'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract');

/**
 *
 * @class
 */
class DeployCoGateway extends CommonSetupBase {
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
   * @param {String} params.gatewayAddress - gateway contract address
   * @param {String} params.anchorAddress - anchor address
   * @param {String} params.organizationAddress - organization address
   * @param {String} params.messageBusLibAddress
   * @param {String} params.gatewayLibAddress
   * @param {Object} params.pendingTransactionExtraData - pending tx extra data
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

    let txOptions = {
      gasPrice: oThis.gasPrice,
      from: oThis.signerAddress,
      gas: contractConstants.deployCoGatewayGas,
      value: contractConstants.zeroValue
    };

    let helperObj = new DeployCoGateway.CoGatewayHelper(),
      txObject = helperObj._deployRawTx(
        oThis.originContractAddress,
        oThis.auxContractAddress,
        oThis.anchorAddress,
        oThis.bounty,
        oThis.organizationAddress,
        oThis.gatewayAddress,
        oThis.messageBusLibAddress,
        oThis.gatewayLibAddress,
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

    if (submitTxRsp && submitTxRsp.isFailure()) {
      return Promise.reject(submitTxRsp);
    }

    return Promise.resolve(submitTxRsp);
  }

  static get CoGatewayHelper() {
    return MosaicJs.ChainSetup.CoGatewayHelper;
  }
}

module.exports = DeployCoGateway;
