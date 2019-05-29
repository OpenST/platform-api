/**
 * Module to help with multiSig operation transactions.
 *
 * @module lib/session/multisigOperation/Base
 */

const OpenSTJs = require('@openst/openst.js'),
  GnosisSafeHelper = OpenSTJs.Helpers.GnosisSafe;

const rootPrefix = '../../..',
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

/**
 * Class to help with multiSig operation transactions.
 *
 * @class MultisigOperationBase
 */
class MultisigOperationBase {
  /**
   * Constructor to help with multiSig operation transactions.
   *
   * @param {object} params
   *
   * @constructor
   */
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
   * Main performer for class.
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

    const gnosisSafeHelperObj = new GnosisSafeHelper(oThis.multisigProxyAddress, oThis._web3Instance),
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

    const txOptions = {
      from: oThis.fromAddress,
      to: oThis.multisigProxyAddress,
      gasPrice: contractConstants.auxChainGasPrice,
      gas: oThis._getMultiSigOperationGas(),
      value: contractConstants.zeroValue
    };

    txOptions.data = txObject.encodeABI();

    const submitTxRsp = await new SubmitTransaction({
      chainId: oThis.auxchainId,
      tokenId: oThis.tokenId,
      pendingTransactionKind: oThis._getMultiSigTransactionKind(),
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
    }

    return responseHelper.successWithData({
      taskStatus: workflowStepConstants.taskFailed,
      taskResponseData: JSON.stringify(submitTxRsp)
    });
  }

  /**
   * Get web3instance to interact with chain.
   *
   * @sets oThis.web3InstanceObj
   *
   * @return {object}
   */
  get _web3Instance() {
    const oThis = this;

    if (oThis.web3InstanceObj) {
      return oThis.web3InstanceObj;
    }

    oThis.web3InstanceObj = web3Provider.getInstance(oThis.chainEndpoint).web3WsProvider;

    return oThis.web3InstanceObj;
  }

  /**
   * Fetches the address which will perform transaction.
   *
   * @sets oThis.fromAddress
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchFromAddress() {
    const oThis = this;

    const tokenAddressesObj = new TokenAddressCache({ tokenId: oThis.tokenId }),
      addressesResp = await tokenAddressesObj.fetch();

    oThis.fromAddress = addressesResp.data[tokenAddressConstants.tokenUserOpsWorkerKind];
  }

  /**
   * Get gas limit for multiSig operation.
   *
   * @private
   */
  _getMultiSigOperationGas() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Get transaction kind.
   *
   * @private
   */
  _getMultiSigTransactionKind() {
    throw new Error('Sub-class to implement.');
  }
}

module.exports = MultisigOperationBase;
