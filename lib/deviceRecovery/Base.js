/**
 * Base class for device recovery.
 *
 * @module lib/deviceRecovery/Base
 */

const OpenStJs = require('@openstfoundation/openst.js'),
  RecoveryHelper = OpenStJs.Helpers.Recovery;

const rootPrefix = '../..',
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CheckTxStatus = require(rootPrefix + '/lib/transactions/CheckTxStatus'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress');

/**
 * Base class for device recovery.
 *
 * @class Base
 */
class Base {
  /**
   * Constructor for base class of device recovery.
   *
   * // For performing transaction.
   * @param {Object} params
   * @param {String} params.recoveryAddress
   * @param {Object} params.pendingTransactionExtraData
   * @param {String/Number} params.auxChainId
   * @param {String} params.chainEndpoint
   * @param {String/Number} params.tokenId
   *
   * // For verifying transaction.
   * @param {String} params.transactionHash
   * @param {String/Number} params.chainId
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    // For performing transaction.
    oThis.recoveryAddress = params.recoveryAddress;
    oThis.pendingTransactionExtraData = params.pendingTransactionExtraData;
    oThis.auxchainId = params.auxChainId;
    oThis.chainEndpoint = params.chainEndpoint;
    oThis.tokenId = params.tokenId;

    // For verifying transaction.
    oThis.transactionHash = params.transactionHash;
    oThis.chainId = params.chainId;

    oThis.fromAddress = null;
  }

  /**
   * Fetch from address.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchFromAddress() {
    const oThis = this;

    const tokenAddressesObj = new TokenAddressCache({ tokenId: oThis.tokenId }),
      addressesResp = await tokenAddressesObj.fetch();

    oThis.fromAddress = addressesResp.data[tokenAddressConstants.recoveryControllerAddressKind];
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
   * This method checks whether the recovery for a user is already ongoing or not.
   * This method returns "true" if recovery for a user is ongoing otherwise it returns "false".
   *
   * @return {Promise<Boolean>}
   *
   * @private
   */
  async _isRecoveryAlreadyOngoing() {
    const oThis = this,
      recoveryHelperObj = new RecoveryHelper(oThis._web3Instance, oThis.recoveryAddress),
      recoveryInfo = await recoveryHelperObj.activeRecoveryInfo();

    // The below condition checks if the recovery for a user is already in progress or not. If the parameters
    // being checked are all null addresses, that means that recovery for a user is not in progress.
    return (
      recoveryInfo.prevOwner !== contractConstants.nullAddress &&
      recoveryInfo.oldOwner !== contractConstants.nullAddress &&
      recoveryInfo.newOwner !== contractConstants.nullAddress
    );
  }

  /**
   * Submit transaction on geth.
   *
   * @param {Object} txOptions
   *
   * @return {Promise<*|result>}
   *
   * @private
   */
  async _submitTransaction(txOptions) {
    const oThis = this;

    const submitTxRsp = await new SubmitTransaction({
      chainId: oThis.auxchainId,
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
   * Check transaction status.
   *
   * @return {Promise<Boolean>}
   *
   * @private
   */
  async _checkTransactionStatus() {
    const oThis = this,
      checkTxStatus = new CheckTxStatus({ chainId: oThis.chainId, transactionHash: oThis.transactionHash }),
      response = await checkTxStatus.perform();

    return response.isSuccess();
  }
}

module.exports = Base;
