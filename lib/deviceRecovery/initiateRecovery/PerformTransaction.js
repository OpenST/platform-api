/**
 * This class file helps in submitting initiate recovery transaction
 *
 * @module lib/deviceRecovery/initiateRecovery/PerformTransaction
 */

const OpenStJs = require('@openstfoundation/openst.js'),
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  RecoveryHelper = OpenStJs.Helpers.Recovery;

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  RecoveryOperationModel = require(rootPrefix + '/app/models/mysql/RecoveryOperation'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  recoveryOperationConstants = require(rootPrefix + '/lib/globalConstant/recoveryOperation');

/**
 * Class to initiate recovery.
 *
 * @class InitiateRecovery
 */
class InitiateRecovery {
  /**
   * Constructor to initiate recovery.
   *
   * @param {Object} params
   * @param {String} params.oldLinkedAddress
   * @param {String} params.oldDeviceAddress
   * @param {String} params.newDeviceAddress
   * @param {String} params.signature
   * @param {String} params.recoveryAddress
   * @param {Object} params.pendingTransactionExtraData
   * @param {String/Number} params.auxChainId
   * @param {String} params.chainEndpoint
   * @param {String/Number} params.tokenId
   * @param {String/Number} params.workflowId
   * @param {String/Number} params.recoveryOperationId
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.oldLinkedAddress = params.oldLinkedAddress;
    oThis.oldDeviceAddress = params.oldDeviceAddress;
    oThis.newDeviceAddress = params.newDeviceAddress;
    oThis.signature = params.signature;
    oThis.recoveryAddress = params.recoveryAddress;
    oThis.pendingTransactionExtraData = params.pendingTransactionExtraData;
    oThis.auxchainId = params.auxChainId;
    oThis.chainEndpoint = params.chainEndpoint;
    oThis.tokenId = params.tokenId;
    oThis.workflowId = params.workflowId;
    oThis.recoveryOperationId = params.recoveryOperationId;

    oThis.fromAddress = null;
    oThis.recoveryOperationStatus = null;
  }

  /**
   * Perform
   *
   * @returns {Promise<any>}
   */
  async perform() {
    const oThis = this;

    await oThis._updateRecoveryOperation();

    if (
      oThis.recoveryOperationStatus ===
      recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.failedStatus]
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_dr_ir_pt_1',
          api_error_identifier: 'recovery_already_in_progress',
          debug_options: {
            recoveryAddress: oThis.recoveryAddress,
            recoveryOperationId: oThis.recoveryOperationId
          }
        })
      );
    }

    await oThis._fetchFromAddress();

    return oThis._performTransaction();
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
   * Get recovery info of user.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _updateRecoveryOperation() {
    const oThis = this,
      recoveryHelperObj = new RecoveryHelper(oThis._web3Instance, oThis.recoveryAddress),
      recoveryInfo = await recoveryHelperObj.activeRecoveryInfo();

    if (
      recoveryInfo.prevOwner !== contractConstants.nullAddress &&
      recoveryInfo.oldOwner !== contractConstants.nullAddress &&
      recoveryInfo.newOwner !== contractConstants.nullAddress
    ) {
      oThis.recoveryOperationStatus =
        recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.failedStatus];
    } else {
      oThis.recoveryOperationStatus =
        recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.inProgressStatus];
    }

    return new RecoveryOperationModel()
      .update({
        workflow_id: oThis.workflowId,
        status: oThis.recoveryOperationStatus
      })
      .where({
        id: oThis.recoveryOperationId
      })
      .fire();
  }

  /**
   * Perform transaction to initiate recovery.
   *
   * @return {Promise<*|result>}
   *
   * @private
   */
  async _performTransaction() {
    const oThis = this;

    const decodedSignature = basicHelper.generateRsvFromSignature(oThis.signature),
      recoveryHelperObj = new RecoveryHelper(oThis._web3Instance, oThis.recoveryAddress),
      txObject = recoveryHelperObj.initiateRecoveryRawTx(
        oThis.oldLinkedAddress,
        oThis.oldDeviceAddress,
        oThis.newDeviceAddress,
        decodedSignature.r,
        decodedSignature.s,
        decodedSignature.v
      );

    const txOptions = {
      from: oThis.fromAddress,
      to: oThis.recoveryAddress,
      gasPrice: contractConstants.auxChainGasPrice,
      gas: contractConstants.initiateRecoveryGas,
      value: contractConstants.zeroValue
    };

    txOptions.data = txObject.encodeABI();

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
}

InstanceComposer.registerAsShadowableClass(
  InitiateRecovery,
  coreConstants.icNameSpace,
  'PerformInitiateRecoveryTransaction'
);

module.exports = {};
