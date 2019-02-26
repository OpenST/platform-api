/**
 * This class file verifies if the perform transaction was done successfully.
 *
 * @module lib/deviceRecovery/byOwner/resetRecoveryOwner/VerifyTransaction
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  DeviceRecoveryBase = require(rootPrefix + '/lib/deviceRecovery/Base'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  recoveryOwnerConstants = require(rootPrefix + '/lib/globalConstant/recoveryOwner'),
  recoveryOperationConstants = require(rootPrefix + '/lib/globalConstant/recoveryOperation');

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/models/ddb/sharded/User');
require(rootPrefix + '/app/models/ddb/sharded/RecoveryOwner');

/**
 * Class to verify reset recovery owner transaction.
 *
 * @class VerifyTransaction
 */
class VerifyTransaction extends DeviceRecoveryBase {
  /**
   * Constructor to verify reset recovery owner transaction.
   *
   * @param {Object} params
   * @param {String} params.userId
   * @param {String/Number} params.tokenId
   * @param {String/Number} params.oldRecoveryOwnerAddress
   * @param {String/Number} params.newRecoveryOwnerAddress
   * @param {String/Number} params.recoveryOperationId
   * @param {String/Number} params.recoveryOwnerShardNumber
   * @param {String/Number} params.userShardNumber
   * @param {String} params.transactionHash
   * @param {String/Number} params.chainId
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.userId = params.userId;
    oThis.tokenId = params.tokenId;
    oThis.oldRecoveryOwnerAddress = params.oldRecoveryOwnerAddress;
    oThis.newRecoveryOwnerAddress = params.newRecoveryOwnerAddress;
    oThis.recoveryOperationId = params.recoveryOperationId;
    oThis.recoveryOwnerShardNumber = params.recoveryOwnerShardNumber;
    oThis.userShardNumber = params.userShardNumber;
  }

  /**
   * Perform
   *
   * @returns {Promise<any>}
   */
  async perform() {
    const oThis = this,
      transactionVerified = await oThis._checkTransactionStatus();

    let intermediateStepsFailed = false;

    if (transactionVerified) {
      const markRevokingResponse = await oThis._markOldRecoveryOwnerAddressRevoked();

      if (markRevokingResponse.isFailure()) {
        intermediateStepsFailed = true;
        logger.error('Could not mark old recovery owner address as revoked.');
        logger.notify(
          'l_dr_bo_rco_vt_1',
          'Could not mark old recovery owner address as revoked.',
          markRevokingResponse
        );
      }

      const markAuthorizedResponse = await oThis._markNewRecoveryOwnerAddressAuthorized();

      if (markAuthorizedResponse.isFailure()) {
        intermediateStepsFailed = true;
        logger.error('Could not mark new recovery owner address as authorized.');
        logger.notify(
          'l_dr_bo_rco_vt_2',
          'Could not mark new recovery owner address as authorized.',
          markAuthorizedResponse
        );
      }

      const updateRecoveryOwnerAddress = await oThis._updateRecoveryOwnerAddressOfUser();

      // If user recovery address owner was not updated.
      if (updateRecoveryOwnerAddress.isFailure()) {
        intermediateStepsFailed = true;
        logger.error('Could not update user with new recovery owner address.');
        logger.notify(
          'l_dr_bo_rco_vt_3',
          'Could not update user with new recovery owner address.',
          updateRecoveryOwnerAddress
        );
      }
    }

    // If any of the intermediate steps fail, recovery operation status should also be marked as failed.
    if (intermediateStepsFailed) {
      await oThis._updateRecoveryOperationStatus(
        transactionVerified,
        recoveryOperationConstants.failedStatus,
        recoveryOperationConstants.failedStatus
      );
    } else {
      // If intermediate steps don't fail, mark successStatus as completed.
      await oThis._updateRecoveryOperationStatus(
        transactionVerified,
        recoveryOperationConstants.completedStatus,
        recoveryOperationConstants.failedStatus
      );
    }

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone
      })
    );
  }

  /**
   * Mark old recovery owner address as revoked.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _markOldRecoveryOwnerAddressRevoked() {
    const oThis = this,
      RecoveryOwnerModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'RecoveryOwner'),
      recoveryOwnerModel = new RecoveryOwnerModel({
        shardNumber: oThis.recoveryOwnerShardNumber
      });

    return recoveryOwnerModel.updateStatusFromInitialToFinal(
      oThis.userId,
      oThis.oldRecoveryOwnerAddress,
      recoveryOwnerConstants.revokingStatus,
      recoveryOwnerConstants.revokedStatus
    );
  }

  /**
   * Mark new recovery owner address as authorized.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _markNewRecoveryOwnerAddressAuthorized() {
    const oThis = this,
      RecoveryOwnerModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'RecoveryOwner'),
      recoveryOwnerModel = new RecoveryOwnerModel({
        shardNumber: oThis.recoveryOwnerShardNumber
      });

    return recoveryOwnerModel.updateStatusFromInitialToFinal(
      oThis.userId,
      oThis.newRecoveryOwnerAddress,
      recoveryOwnerConstants.authorizingStatus,
      recoveryOwnerConstants.authorizedStatus
    );
  }

  /**
   * Update recovery owner address of user.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _updateRecoveryOwnerAddressOfUser() {
    const oThis = this,
      UserModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserModel'),
      userModelObj = new UserModel({
        shardNumber: oThis.userShardNumber
      }),
      updateParams = {
        tokenId: oThis.tokenId,
        userId: oThis.userId,
        recoveryOwnerAddress: oThis.newRecoveryOwnerAddress
      };

    return userModelObj.updateItem(updateParams, null, 'ALL_NEW');
  }
}

InstanceComposer.registerAsShadowableClass(
  VerifyTransaction,
  coreConstants.icNameSpace,
  'VerifyResetRecoveryOwnerTransaction'
);

module.exports = {};
