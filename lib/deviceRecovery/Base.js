/**
 * Module for base class for recovery operations.
 *
 * @module lib/deviceRecovery/Base
 */

const OpenStJs = require('@openst/openst.js'),
  RecoveryHelper = OpenStJs.Helpers.Recovery;

const rootPrefix = '../..',
  WorkflowModel = require(rootPrefix + '/app/models/mysql/Workflow'),
  CheckTxStatus = require(rootPrefix + '/lib/transactions/CheckTxStatus'),
  ErrorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  RecoveryOperationModel = require(rootPrefix + '/app/models/mysql/RecoveryOperation'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  recoveryOperationConstants = require(rootPrefix + '/lib/globalConstant/recoveryOperation');

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/models/ddb/sharded/Device');
require(rootPrefix + '/app/models/ddb/sharded/RecoveryOwner');

/**
 * Base class for recovery operations.
 *
 * @class Base
 */
class Base {
  /**
   * Constructor for base class of recovery operations.
   *
   * // For performing transaction.
   * @param {object} params
   * @param {string} [params.recoveryAddress]
   * @param {object} [params.pendingTransactionExtraData]
   * @param {string/number} [params.auxChainId]
   * @param {string/number} [params.tokenId]
   *
   * // For verifying transaction.
   * @param {string} [params.userId]
   * @param {string/number} [params.deviceShardNumber]
   * @param {string/number} [params.initiateRecoveryOperationId]
   * @param {string} [params.transactionHash]
   * @param {string/number} [params.chainId]
   * @param {string/number} [params.recoveryOwnerShardNumber]
   * @param {string/number} [params.oldRecoveryOwnerAddress]
   * @param {string/number} [params.newRecoveryOwnerAddress]
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    // For performing transaction.
    oThis.userId = params.userId;
    oThis.recoveryAddress = params.recoveryAddress;
    oThis.deviceShardNumber = params.deviceShardNumber;
    oThis.pendingTransactionExtraData = params.pendingTransactionExtraData;
    oThis.auxchainId = params.auxChainId;
    oThis.tokenId = params.tokenId;
    oThis.oldRecoveryOwnerAddress = params.oldRecoveryOwnerAddress;
    oThis.newRecoveryOwnerAddress = params.newRecoveryOwnerAddress;

    // For verifying transaction.
    oThis.initiateRecoveryOperationId = params.initiateRecoveryOperationId;
    oThis.transactionHash = params.transactionHash;
    oThis.chainId = params.chainId;
    oThis.recoveryOwnerShardNumber = params.recoveryOwnerShardNumber;

    oThis.fromAddress = null;
    oThis.blockNumber = null;
  }

  /**
   * Fetch from address.
   *
   * @sets oThis.fromAddress
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchFromAddress() {
    const oThis = this;

    const tokenAddressesObj = new TokenAddressCache({ tokenId: oThis.tokenId }),
      addressesResp = await tokenAddressesObj.fetch();

    oThis.fromAddress = addressesResp.data[tokenAddressConstants.recoveryControllerAddressKind];
  }

  /**
   * Get web3instance to interact with chain.
   *
   * @sets oThis.web3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _web3Instance() {
    const oThis = this;

    const providers = oThis.ic().configStrategy.auxGeth.readWrite.wsProviders;

    oThis.web3Instance = web3Provider.getInstance(providers[0]).web3WsProvider;
  }

  /**
   * This method checks whether the recovery for a user is already ongoing or not.
   * This method returns "true" if recovery for a user is ongoing otherwise it returns "false".
   *
   * @return {Promise<boolean>}
   * @private
   */
  async _isRecoveryAlreadyOngoing() {
    const oThis = this;

    await oThis._web3Instance();

    const recoveryHelperObj = new RecoveryHelper(oThis.web3Instance, oThis.recoveryAddress),
      recoveryInfo = await recoveryHelperObj.activeRecoveryInfo();

    // The below condition checks if the recovery for a user is already in progress or not. If the parameters
    // Being checked are all null addresses, that means that recovery for a user is not in progress.
    return (
      recoveryInfo.prevOwner !== contractConstants.nullAddress &&
      recoveryInfo.oldOwner !== contractConstants.nullAddress &&
      recoveryInfo.newOwner !== contractConstants.nullAddress
    );
  }

  /**
   * Submit transaction on geth.
   *
   * @param {object} txOptions
   *
   * @return {Promise<*|result>}
   * @private
   */
  async _submitTransaction(txOptions) {
    const oThis = this;

    let transactionFailed = false,
      transactionFailureResponse = {};

    const submitTxRsp = await new SubmitTransaction({
      chainId: oThis.auxchainId,
      tokenId: oThis.tokenId,
      pendingTransactionKind: oThis._pendingTransactionKind,
      web3Instance: oThis.web3Instance,
      txOptions: txOptions,
      options: oThis.pendingTransactionExtraData
    })
      .perform()
      .catch(async function(error) {
        logger.error('Perform transaction failed. Error: ', error);

        await oThis._performTransactionFailedSteps();

        transactionFailed = true;
        transactionFailureResponse = {
          taskStatus: workflowStepConstants.taskFailed,
          debugParams: {
            internalErrorCode: error.internalErrorCode
          }
        };
      });

    if (transactionFailed) {
      return responseHelper.successWithData(transactionFailureResponse);
    }

    return responseHelper.successWithData({
      taskStatus: workflowStepConstants.taskPending,
      transactionHash: submitTxRsp.data.transactionHash,
      taskResponseData: {
        from: oThis.fromAddress,
        transactionHash: submitTxRsp.data.transactionHash
      }
    });
  }

  /**
   * Steps to be performed if transaction fails.
   *
   * @return {Promise<void>}
   * @private
   */
  async _performTransactionFailedSteps() {
    const oThis = this;

    await oThis._markRecoveryOperationStatusFailed();

    const errorObject = responseHelper.error({
      internal_error_identifier: 'recovery_operation_not_performed:l_dr_b_1',
      api_error_identifier: 'recovery_operation_not_performed',
      debug_options: { recoveryOperationId: oThis.recoveryOperationId }
    });

    await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);
  }

  /**
   * Change device statuses.
   *
   * @param {object} statusMap
   *
   * @returns {Promise<void>}
   * @private
   */
  async _changeDeviceStatuses(statusMap) {
    const oThis = this,
      DeviceModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceModel');

    const promises = [];

    let ddbQueryFailed = false;

    for (const address in statusMap) {
      const initialStatus = statusMap[address].initial,
        finalStatus = statusMap[address].final,
        deviceModelObj = new DeviceModel({ shardNumber: oThis.deviceShardNumber });

      promises.push(
        new Promise(function(onResolve) {
          deviceModelObj
            .updateStatusFromInitialToFinal(oThis.userId, address, initialStatus, finalStatus)
            .then(function(resp) {
              if (resp.isFailure()) {
                ddbQueryFailed = true;
              }
              onResolve();
            })
            .catch(function(error) {
              logger.error(error);
              ddbQueryFailed = true;
              onResolve();
            });
        })
      );
    }

    await Promise.all(promises);

    // If ddb query is failed. Then reject initiate recovery request.
    if (ddbQueryFailed) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_dr_b_2',
          api_error_identifier: 'action_not_performed_contact_support',
          debug_options: {}
        })
      );
    }
  }

  /**
   * Change recovery owner statuses.
   *
   * @param {object} statusMap
   *
   * @return {Promise<void>}
   * @private
   */
  async _changeRecoveryOwnerStatuses(statusMap) {
    const oThis = this,
      RecoveryOwnerModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'RecoveryOwner');

    const promises = [];

    let ddbQueryFailed = false;

    for (const address in statusMap) {
      const initialStatus = statusMap[address].initial,
        finalStatus = statusMap[address].final,
        recoveryOwnerModelObj = new RecoveryOwnerModel({ shardNumber: oThis.recoveryOwnerShardNumber });

      promises.push(
        new Promise(function(onResolve) {
          recoveryOwnerModelObj
            .updateStatusFromInitialToFinal(oThis.userId, address, initialStatus, finalStatus)
            .then(function(resp) {
              if (resp.isFailure()) {
                ddbQueryFailed = true;
              }
              onResolve();
            })
            .catch(function(error) {
              logger.error(error);
              ddbQueryFailed = true;
              onResolve();
            });
        })
      );
    }

    await Promise.all(promises);

    // If ddb query is failed. Then reject initiate recovery request.
    if (ddbQueryFailed) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_dr_b_3',
          api_error_identifier: 'action_not_performed_contact_support',
          debug_options: {}
        })
      );
    }
  }

  /**
   * Check transaction status.
   *
   * @param {boolean} [getBlockNumber]: This value is true if blockNumber is to be set otherwise it's false.
   *
   * @sets oThis.blockNumber
   *
   * @return {Promise<boolean>}
   * @private
   */
  async _checkTransactionStatus(getBlockNumber = false) {
    const oThis = this,
      checkTxStatus = new CheckTxStatus({ chainId: oThis.chainId, transactionHash: oThis.transactionHash }),
      response = await checkTxStatus.perform();

    if (getBlockNumber) {
      oThis.blockNumber = response.data.ddbTransaction.blockNumber;
    }

    return response.isSuccess();
  }

  /**
   * Update recovery operation status as successStatus or failureStatus.
   *
   * @param {boolean} transactionVerified
   * @param {string} successStatus
   * @param {string} failureStatus
   * @param {number} [executeAfterBlocks]: This value determines the blockNumber after which executeRecovery operation
   *                                       should be performed.
   *
   * @return {Promise<void>}
   * @private
   */
  async _updateRecoveryOperationStatus(transactionVerified, successStatus, failureStatus, executeAfterBlocks = 0) {
    const oThis = this;

    let status = null;

    if (transactionVerified) {
      status = recoveryOperationConstants.invertedStatuses[successStatus];
    } else {
      // We are manually assigning executeAfterBlocks to 0 because in case of initiateRecovery, we will get a value for
      // ExecuteAfterBlocks regardless of transactionVerification status. So we need to set it to 0 if
      // Recovery operation fails.
      status = recoveryOperationConstants.invertedStatuses[failureStatus];
      executeAfterBlocks = 0;
    }

    return new RecoveryOperationModel().updateRecoveryOperation(oThis.recoveryOperationId, {
      token_id: oThis.tokenId,
      user_id: oThis.userId,
      status: status,
      execute_after_blocks: executeAfterBlocks
    });
  }

  /**
   * Mark recovery operation as failed.
   *
   * @return {Promise<*|void>}
   * @private
   */
  async _markRecoveryOperationStatusFailed() {
    const oThis = this;

    return new RecoveryOperationModel().updateRecoveryOperation(oThis.recoveryOperationId, {
      token_id: oThis.tokenId,
      user_id: oThis.userId,
      status: recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.failedStatus]
    });
  }

  /**
   * Update initiate recovery operation status as successStatus or failureStatus.
   *
   * @param {boolean} transactionVerified
   * @param {string} successStatus
   * @param {string} failureStatus
   * @param {number} [executeAfterBlocks]: This value determines the blockNumber after which executeRecovery operation
   *                                       should be performed.
   *
   * @return {Promise<void>}
   * @private
   */
  async _updateInitiateRecoveryOperationStatus(transactionVerified, successStatus, failureStatus, executeAfterBlocks) {
    const oThis = this;

    let status = null,
      updateQuery = {};

    if (transactionVerified) {
      status = recoveryOperationConstants.invertedStatuses[successStatus];
      updateQuery = {
        status: status,
        execute_after_blocks: executeAfterBlocks
      };
    } else {
      // Execute_after_blocks is not updated in case of failure.
      status = recoveryOperationConstants.invertedStatuses[failureStatus];
      updateQuery = {
        status: status
      };
    }

    Object.assign(updateQuery, { token_id: oThis.tokenId, user_id: oThis.userId });

    return new RecoveryOperationModel().updateRecoveryOperation(oThis.initiateRecoveryOperationId, updateQuery);
  }

  /**
   * Validate initiate recovery operation before admin action on it.
   *
   * @sets oThis.initiateRecoveryOperation, oThis.initiateRecoveryWorkflow
   *
   * @returns {Promise<Void>}
   * @private
   */
  async _validateInitiateRecoveryOperation() {
    const oThis = this;

    const resp = await new RecoveryOperationModel()
      .select('*')
      .where({ id: oThis.initiateRecoveryOperationId })
      .fire();

    // No record found for given recovery operation
    if (resp.length <= 0) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_dr_b_3',
          api_error_identifier: 'action_not_performed_contact_support',
          debug_options: {}
        })
      );
    }

    // If recovery operation is not in waitingForAdminActionStatus, reject.
    if (
      resp[0].status !=
      recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.waitingForAdminActionStatus]
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_dr_b_4',
          api_error_identifier: 'action_not_performed_contact_support',
          debug_options: {}
        })
      );
    }

    oThis.initiateRecoveryOperation = resp[0];

    const queryResp = await new WorkflowModel()
      .select('*')
      .where({ id: oThis.initiateRecoveryOperation.workflow_id })
      .fire();

    oThis.initiateRecoveryWorkflow = queryResp[0];
  }

  /**
   * Pending transaction kind.
   *
   * @private
   * @return {string}
   */
  get _pendingTransactionKind() {
    throw new Error(
      'If a sub class calls _submitTransaction, it needs to implement this and return pendingTransactionKind.'
    );
  }
}

module.exports = Base;
