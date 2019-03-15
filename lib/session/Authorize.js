'use strict';
/**
 * This class file helps in submitting authorize transaction
 *
 * @module lib/multisigOperation/AuthorizeDeviceTransaction
 */

const OpenSTJs = require('@openstfoundation/openst.js'),
  OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer,
  GnosisSafeHelper = OpenSTJs.Helpers.GnosisSafe;

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

class AuthorizeSessionTransaction {
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
    oThis.signatures = params.signatures;
    oThis.signer = params.signer;
    oThis.pendingTransactionExtraData = params.pendingTransactionExtraData;
    oThis.auxchainId = params.auxChainId;
    oThis.chainEndpoint = params.chainEndpoint;
    oThis.multisigProxyAddress = params.multisigAddress;
    oThis.tokenId = params.tokenId;
  }

  /**
   * Perform
   *
   * @returns {Promise<*>}
   */
  async perform() {
    const oThis = this;

    await oThis._fetchFromAddress();
    return oThis._performTransaction();
  }

  /**
   * This function performs the authorize session transaction.
   *
   * @returns {Promise<*|result>}
   */
  async _performTransaction() {
    const oThis = this;

    let gnosisSafeHelperObj = new GnosisSafeHelper(oThis.multisigProxyAddress, oThis._web3Instance),
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
        oThis.signatures
      );

    let txOptions = {
      from: oThis.fromAddress,
      to: oThis.multisigProxyAddress,
      gasPrice: contractConstants.auxChainGasPrice,
      gas: contractConstants.authorizeSessionGas,
      value: contractConstants.zeroValue
    };

    txOptions.data = txObject.encodeABI();

    let submitTxRsp = await new SubmitTransaction({
      chainId: oThis.auxchainId,
      tokenId: oThis.tokenId,
      pendingTransactionKind: pendingTransactionConstants.authorizeSessionKind,
      web3Instance: oThis._web3Instance,
      txOptions: txOptions,
      options: oThis.pendingTransactionExtraData
    }).perform();

    if (submitTxRsp.isSuccess()) {
      return responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskPending,
        transactionHash: submitTxRsp.data.transactionHash,
        taskResponseData: {
          from: oThis.fromAddress,
          chainEndPoint: oThis.chainEndPoint,
          transactionHash: submitTxRsp.data.transactionHash
        }
      });
    } else {
      return responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskFailed,
        taskResponseData: JSON.stringify(submitTxRsp)
      });
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

  /**
   * Fetches the address which will perform transaction.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchFromAddress() {
    const oThis = this;

    let tokenAddressesObj = new TokenAddressCache({ tokenId: oThis.tokenId }),
      addressesResp = await tokenAddressesObj.fetch();

    oThis.fromAddress = addressesResp.data[tokenAddressConstants.tokenUserOpsWorkerKind];
  }
}

InstanceComposer.registerAsShadowableClass(
  AuthorizeSessionTransaction,
  coreConstants.icNameSpace,
  'AuthorizeSessionPerformTransaction'
);
