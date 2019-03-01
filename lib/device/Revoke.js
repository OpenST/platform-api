'use strict';
/**
 * This class file helps in submitting revoke device transaction
 *
 * @module lib/device/Revoke
 */

const OpenSTJs = require('@openstfoundation/openst.js'),
  OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer,
  GnosisSafeHelper = OpenSTJs.Helpers.GnosisSafe;

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
/**
 * Class for RevokeDeviceTransaction.
 *
 * @class
 */
class RevokeDeviceTransaction {
  /**
   *
   * @param {Object} params
   *
   * @param {String} params.to - Destination address of Safe transaction, multisig proxy address
   * @param {String/Number} params.value - Ether value of Safe transaction, eth value in wei
   * @param {String} params.calldata - Data payload of Safe transaction
   * @param {Object} params.rawCalldata - Raw call data
   * @param {Number} params.operation - Operation type of Safe transaction
   * @param {String/Number} params.safeTxGas - Gas that should be used for the Safe transaction
   * @param {String/Number} params.dataGas - Gas costs for data used to trigger the safe transaction and to pay the payment transfer
   * @param {String/Number} params.gasPrice - Gas price that should be used for the payment calculation
   * @param {String} params.gasToken - Token address (or 0 if ETH) that is used for the payment
   * @param {String} params.refundReceiver - Address of receiver of gas payment (or 0 if tx.origin)
   * @param {String} params.signatures - Packed signature data ({bytes32 r}{bytes32 s}{uint8 v})
   * @param {String} params.signer - authorized device address which signed this transaction
   * @param {String} params.pendingTransactionExtraData
   * @param {String} params.auxChainId
   * @param {String} params.chainEndpoint
   * @param {String} params.multisigAddress
   * @param {Number} params.tokenId
   * @param {String} params.userId
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
        oThis.signatures
      );

    let txOptions = {
      from: oThis.fromAddress,
      to: oThis.multisigProxyAddress,
      gasPrice: contractConstants.auxChainGasPrice,
      gas: contractConstants.revokeDeviceGas,
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
   * Clear linked device address map cache.
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _clearLinkedDeviceAddressCacheMap() {
    const oThis = this,
      PreviousOwnersMapCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'PreviousOwnersMap'),
      previousOwnersMapObj = new PreviousOwnersMapCache({ userId: oThis.userId, tokenId: oThis.tokenId });

    await previousOwnersMapObj.clear();
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
  RevokeDeviceTransaction,
  coreConstants.icNameSpace,
  'RevokeDevicePerformTransaction'
);
