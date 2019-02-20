'use strict';
/**
 * This class file helps in submitting authorize transaction
 *
 * @module lib/multisigOperation/AuthorizeDeviceTransaction
 */

const OpenStJs = require('@openstfoundation/openst.js'),
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  GnosisSafeHelper = OpenStJs.Helpers.GnosisSafe;

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

require(rootPrefix + '/lib/cacheManagement/chain/PreviousOwnersMap');

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
    oThis.pendingTransactionExtraData = params.pendingTransactionExtraData;
    oThis.auxchainId = params.auxChainId;
    oThis.chainEndpoint = params.chainEndpoint;
    oThis.multisigProxyAddress = params.multisigAddress;
    oThis.tokenId = params.tokenId;
    oThis.userId = params.userId;
  }

  /**
   * Perform
   *
   * @returns {Promise<any>}
   */
  async perform() {
    const oThis = this;

    await oThis._fetchFromAddress();

    return oThis._performTransaction();
  }

  /**
   * Perform transaction
   *
   * @return {Promise<any>}
   * @private
   */
  async _performTransaction() {
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

    let txOptions = {
      from: oThis.fromAddress,
      to: oThis.multisigProxyAddress,
      gasPrice: contractConstants.auxChainGasPrice,
      gas: contractConstants.authorizeDeviceGas,
      value: contractConstants.zeroValue
    };

    txOptions.data = txObject.encodeABI();

    let submitTxRsp = await new SubmitTransaction({
      chainId: oThis.auxchainId,
      web3Instance: oThis._web3Instance,
      txOptions: txOptions,
      options: oThis.pendingTransactionExtraData
    }).perform();

    await oThis._clearLinkedDeviceAddressCacheMap();

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

  /**
   * Clear linked device address map cache
   *
   * @returns {Promise<void>}
   * @private
   */
  async _clearLinkedDeviceAddressCacheMap() {
    const oThis = this;

    let PreviousOwnersMapCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'PreviousOwnersMap'),
      previousOwnersMapObj = new PreviousOwnersMapCache({ userId: oThis.userId, tokenId: oThis.tokenId }),
      previousOwnersMapRsp = await previousOwnersMapObj.clear();
  }
}

InstanceComposer.registerAsShadowableClass(
  AuthorizeDeviceTransaction,
  coreConstants.icNameSpace,
  'AuthorizeDevicePerformTransaction'
);
