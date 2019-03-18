'use strict';

/**
 * deploy Gateway contract on origin class
 *
 * @module lib/setup/common/DeployGateway
 */
const rootPrefix = '../../..',
  CommonSetupBase = require(rootPrefix + '/lib/setup/common/Base'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  MosaicJs = require('@openst/mosaic.js');

/**
 *
 * @class
 */
class DeployGateway extends CommonSetupBase {
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

    oThis.tokenAddress = params['tokenAddress'];
    oThis.baseTokenAddress = params['baseTokenAddress'];
    oThis.anchorAddress = params['anchorAddress'];
    oThis.organizationAddress = params['organizationAddress'];
    oThis.messageBusLibAddress = params['messageBusLibAddress'];
    oThis.gatewayLibAddress = params['gatewayLibAddress'];

    oThis.bounty = contractConstants.bountyForGateway;
  }

  /**
   * Async performer
   *
   * @return {Promise<result>}
   */
  async _asyncPerform() {
    const oThis = this;

    let txOptions = {
      gasPrice: oThis.gasPrice,
      from: oThis.signerAddress,
      gas: contractConstants.deployGatewayGas,
      value: contractConstants.zeroValue
    };

    let helperObj = new DeployGateway.GatewayHelper(),
      txObject = helperObj._deployRawTx(
        oThis.tokenAddress,
        oThis.baseTokenAddress,
        oThis.anchorAddress,
        oThis.bounty,
        oThis.organizationAddress,
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

  static get GatewayHelper() {
    return MosaicJs.ChainSetup.GatewayHelper;
  }
}

module.exports = DeployGateway;
