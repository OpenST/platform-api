'use strict';
/**
 * This class file helps in submitting authorize transaction
 *
 * @module lib/multisigOperation/AuthorizeDeviceTransaction
 */

const OpenStJs = require('@openstfoundation/openst.js'),
  OSTBase = require('@openstfoundation/openst-base'),
  abiDecoder = require('abi-decoder'),
  InstanceComposer = OSTBase.InstanceComposer,
  GnosisSafeHelper = OpenStJs.Helpers.GnosisSafe;

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

class AuthorizeDeviceTransaction {
  constructor(params) {
    const oThis = this;

    oThis.toAddress = params.to;
    oThis.value = params.value;
    oThis.calldata = params.calldata;
    oThis.rawCallData = params.rawCalldata;
    oThis.operation = params.operation;
    oThis.safeTxGas = params.safeTxGas;
    oThis.dataGas = params.dataGas;
    oThis.gasPrice = params.gasPrice;
    oThis.gasToken = params.gasToken;
    oThis.refundReceiver = params.refundReceiver;
    oThis.signature = params.signature;
    oThis.signer = params.signer;

    oThis.pendingTransactionExtraData = params['pendingTransactionExtraData'];
    oThis.auxchainId = params['auxChainId'];
    oThis.chainEndpoint = params['chainEndpoint'];
    oThis.multisigProxyAddress = params['multisigProxyAddress'];
    oThis.tokenId = params['tokenId'];
  }

  async perform() {
    const oThis = this;

    await oThis._fetchAndSetTokenHolderManagerAddress();
    return oThis.performTransaction();
  }

  async performTransaction() {
    const oThis = this;

    let gnosisSafeHelperObj = new GnosisSafeHelper(oThis.toAddress, oThis._web3Instance),
      txObject = gnosisSafeHelperObj._execTransactionRawTx(
        oThis.toAddress,
        oThis.value,
        oThis.calldata,
        oThis.operation,
        oThis.safeTxGas,
        oThis.dataGas,
        oThis.gasPrice,
        oThis.gasToken,
        oThis.refundReceiver,
        oThis.signature
      );

    let params = {
      toAddress: oThis.toAddress,
      value: oThis.value,
      callData: oThis.calldata,
      operation: oThis.operation,
      safeTxGas: oThis.safeTxGas,
      dataGas: oThis.dataGas,
      gasPrice: oThis.gasPrice,
      gasToken: oThis.gasToken,
      refundReceiver: oThis.refundReceiver,
      signature: oThis.signature
    };

    console.log('======txObject ke params==', params);

    let txOptions = {
      from: '0x7ba5e5f1dbe2fa4f52c3943a5603d28fb31a7603',
      to: oThis.toAddress, //Todo: Multi sig address
      gasPrice: '0x3B9ACA00',
      gas: 7500000, //Temp: To know how much gas is required
      value: contractConstants.zeroValue
    };

    console.log('=======txOptions====', txOptions);

    txOptions['data'] = txObject.encodeABI();

    let submitTxRsp = await new SubmitTransaction({
      chainId: oThis.auxchainId,
      web3Instance: oThis._web3Instance,
      txOptions: txOptions,
      options: oThis.pendingTransactionExtraData
    }).perform();

    if (submitTxRsp.isSuccess()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskPending,
          transactionHash: submitTxRsp.data.transactionHash,
          taskResponseData: {
            from: oThis.fromAddress,
            chainEndPoint: oThis.chainEndPoint,
            transactionHash: submitTxRsp.data.transactionHash
          }
        })
      );
    } else {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskFailed,
          taskResponseData: JSON.stringify(submitTxRsp)
        })
      );
    }
  }

  /**
   * Get web3instance to interact with chain
   *
   * @return {Object}
   */
  get _web3Instance() {
    const oThis = this;

    if (oThis.web3InstanceObj) return oThis.web3InstanceObj;

    oThis.web3InstanceObj = web3Provider.getInstance(oThis.chainEndpoint).web3WsProvider;

    return oThis.web3InstanceObj;
  }

  async _fetchAndSetTokenHolderManagerAddress() {
    const oThis = this;

    let tokenAddressesObj = new TokenAddressCache({ tokenId: oThis.tokenId }),
      addressesResp = await tokenAddressesObj.fetch();

    oThis.fromAddress = addressesResp.data[tokenAddressConstants.auxWorkerAddressKind][0]; //Todo: To be changed to token holder manager kind
  }
}

InstanceComposer.registerAsShadowableClass(
  AuthorizeDeviceTransaction,
  coreConstants.icNameSpace,
  'AuthorizeDevicePerformTransaction'
);
