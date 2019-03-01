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
require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');

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
    oThis.recoveryOperationId = params.recoveryOperationId;
  }

  /**
   * Perform
   *
   * @returns {Promise<any>}
   */
  async perform() {
    const oThis = this;

    let transactionVerified = await oThis._checkTransactionStatus();

    await oThis._updateRecoveryOwnerStatuses(transactionVerified).catch((err) => {
      logger.error('Could not update recovery owners statuses:', err);
      logger.notify('l_dr_bo_rco_vt_4', 'Could not update recovery owners statuses.', err);
      transactionVerified = false;
    });

    // If transaction is verified, then update recovery owner in user
    if (transactionVerified) {
      const updateRecoveryOwnerAddress = await oThis._updateRecoveryOwnerAddressOfUser();

      // If user recovery address owner was not updated.
      if (updateRecoveryOwnerAddress.isFailure()) {
        logger.error('Could not update user with new recovery owner address.');
        logger.notify(
          'l_dr_bo_rco_vt_3',
          'Could not update user with new recovery owner address.',
          updateRecoveryOwnerAddress
        );
      }
    }

    // Update recovery operation as completed or failed based on transaction status.
    await oThis._updateRecoveryOperationStatus(
      transactionVerified,
      recoveryOperationConstants.completedStatus,
      recoveryOperationConstants.failedStatus
    );

    if (transactionVerified) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskDone
        })
      );
    }
    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskFailed
      })
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
    const oThis = this;

    // Fetch userShardNumber.
    const TokenShardNumbersCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenShardNumbersCache'),
      tokenShardNumbersCache = new TokenShardNumbersCache({
        tokenId: oThis.tokenId
      }),
      tokenShardResponse = await tokenShardNumbersCache.fetch(),
      userShardNumber = tokenShardResponse.data.user;

    // Update recovery owner address for user.
    const UserModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserModel'),
      userModelObj = new UserModel({
        shardNumber: userShardNumber
      }),
      updateParams = {
        tokenId: oThis.tokenId,
        userId: oThis.userId,
        recoveryOwnerAddress: oThis.newRecoveryOwnerAddress
      };

    return userModelObj.updateItem(updateParams, null, 'ALL_NEW');
  }

  /**
   * Update recovery owner address statuses in case of failure.
   *
   * @param {Boolean} isSuccessful: If verification of transaction was successful, this value is true, else false.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _updateRecoveryOwnerStatuses(isSuccessful) {
    const oThis = this;

    let statusMap = {};

    if (isSuccessful) {
      // Change old recovery owner status from revokingStatus to authorizedStatus.
      // Change new recovery owner status from authorizingStatus to registeredStatus.
      statusMap = {
        [oThis.oldRecoveryOwnerAddress]: {
          initial: recoveryOwnerConstants.revokingStatus,
          final: recoveryOwnerConstants.revokedStatus
        },
        [oThis.newRecoveryOwnerAddress]: {
          initial: recoveryOwnerConstants.authorizingStatus,
          final: recoveryOwnerConstants.authorizedStatus
        }
      };
    } else {
      // Change old recovery owner status from revokingStatus to authorizedStatus.
      // Change new recovery owner status from authorizingStatus to registeredStatus.
      statusMap = {
        [oThis.oldRecoveryOwnerAddress]: {
          initial: recoveryOwnerConstants.revokingStatus,
          final: recoveryOwnerConstants.authorizedStatus
        },
        [oThis.newRecoveryOwnerAddress]: {
          initial: recoveryOwnerConstants.authorizingStatus,
          final: recoveryOwnerConstants.authorizationFailedStatus
        }
      };
    }

    await oThis._changeRecoveryOwnerStatuses(statusMap);
  }
}

InstanceComposer.registerAsShadowableClass(
  VerifyTransaction,
  coreConstants.icNameSpace,
  'VerifyResetRecoveryOwnerTransaction'
);

module.exports = {};
