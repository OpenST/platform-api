/**
 * This class file helps in submitting abort recovery transaction by user.
 *
 * @module lib/deviceRecovery/byOwner/abortRecovery/PerformTransaction
 */

const OpenStJs = require('@openstfoundation/openst.js'),
  OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer,
  RecoveryHelper = OpenStJs.Helpers.Recovery;

const rootPrefix = '../../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  DeviceRecoveryBase = require(rootPrefix + '/lib/deviceRecovery/Base'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  RecoveryOperationModel = require(rootPrefix + '/app/models/mysql/RecoveryOperation'),
  recoveryOperationConstants = require(rootPrefix + '/lib/globalConstant/recoveryOperation');

/**
 * Class to abort recovery.
 *
 * @class AbortRecovery
 */
class AbortRecovery extends DeviceRecoveryBase {
  /**
   * Constructor to abort recovery.
   *
   * @param {Object} params
   * @param {String} params.oldLinkedAddress
   * @param {String} params.oldDeviceAddress
   * @param {String} params.newDeviceAddress
   * @param {String} params.signature
   * @param {String} params.recoveryAddress
   * @param {Object} params.pendingTransactionExtraData
   * @param {String/Number} params.auxChainId
   * @param {String/Number} params.tokenId
   * @param {String/Number} params.workflowId
   * @param {String/Number} params.recoveryOperationId
   * @param {String/Number} params.recoveryOperationId
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.oldLinkedAddress = params.oldLinkedAddress;
    oThis.oldDeviceAddress = params.oldDeviceAddress;
    oThis.newDeviceAddress = params.newDeviceAddress;
    oThis.signature = params.signature;
    oThis.workflowId = params.workflowId;
    oThis.recoveryOperationId = params.recoveryOperationId;

    oThis.recoveryOperationStatus = null;
  }

  /**
   * Perform
   *
   * @returns {Promise<any>}
   */
  async perform() {
    const oThis = this;

    // This method updates the recovery_operations table with the workflowId and the status.
    await oThis._updateRecoveryOperation();

    if (
      oThis.recoveryOperationStatus ===
      recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.failedStatus]
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_dr_bo_ar_pt_1',
          api_error_identifier: 'recovery_never_initiated',
          debug_options: {
            recoveryAddress: oThis.recoveryAddress,
            recoveryOperationId: oThis.recoveryOperationId
          }
        })
      );
    }

    await oThis._fetchFromAddress();

    return await oThis._performTransaction();
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
      isRecoveryAlreadyOngoing = await oThis._isRecoveryAlreadyOngoing();

    if (!isRecoveryAlreadyOngoing) {
      logger.error('Cannot abort recovery for user as recovery was never started.');
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
      recoveryHelperObj = new RecoveryHelper(oThis.web3Instance, oThis.recoveryAddress),
      txObject = await recoveryHelperObj.abortRecoveryByOwnerRawTx(
        oThis.web3Instance.utils.toChecksumAddress(oThis.oldLinkedAddress),
        oThis.web3Instance.utils.toChecksumAddress(oThis.oldDeviceAddress),
        oThis.web3Instance.utils.toChecksumAddress(oThis.newDeviceAddress),
        decodedSignature.r,
        decodedSignature.s,
        decodedSignature.v
      );

    const txOptions = {
      from: oThis.fromAddress,
      to: oThis.recoveryAddress,
      gasPrice: contractConstants.auxChainGasPrice,
      gas: contractConstants.abortRecoveryByOwnerGas,
      value: contractConstants.zeroValue
    };

    txOptions.data = txObject.encodeABI();

    return await oThis._submitTransaction(txOptions);
  }

  /**
   *
   * pendingTransactionKind
   *
   * @private
   *
   * @return {String}
   *
   */
  get _pendingTransactionKind() {
    return pendingTransactionConstants.abortRecoveryByOwnerKind;
  }
}

InstanceComposer.registerAsShadowableClass(
  AbortRecovery,
  coreConstants.icNameSpace,
  'PerformAbortRecoveryByOwnerTransaction'
);

module.exports = {};
