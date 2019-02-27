/**
 * This service initiates reset recovery owner of user.
 *
 * @module app/services/user/recovery/ResetOwner
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  workflowTopicConstants = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  UserRecoveryServiceBase = require(rootPrefix + '/app/services/user/recovery/Base'),
  recoveryOwnerConstants = require(rootPrefix + '/lib/globalConstant/recoveryOwner'),
  RecoveryOperationModelKlass = require(rootPrefix + '/app/models/mysql/RecoveryOperation'),
  recoveryOperationConstants = require(rootPrefix + '/lib/globalConstant/recoveryOperation'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  ResetRecoveryOwnerRouter = require(rootPrefix + '/lib/workflow/deviceRecovery/byOwner/resetRecoveryOwner/Router');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/app/models/ddb/sharded/RecoveryOwner');
require(rootPrefix + '/lib/cacheManagement/chainMulti/RecoveryOwnerDetail');

/**
 * Class to reset recovery owner of user.
 *
 * @class ResetRecoveryOwner
 */
class ResetRecoveryOwner extends UserRecoveryServiceBase {
  /**
   * Constructor to reset recovery owner of user.
   *
   * @param {Object} params
   * @param {Number} params.client_id
   * @param {Number} params.token_id
   * @param {String} params.user_id
   * @param {String} params.new_recovery_owner_address
   * @param {String} params.to: Transaction to address, user recovery proxy address
   * @param {String} params.signature: Packed signature data ({bytes32 r}{bytes32 s}{uint8 v})
   * @param {String} params.signer: recovery owner address who signed this transaction
   *
   * @constructor
   */
  constructor(params) {
    super(params);
    const oThis = this;

    oThis.newRecoveryOwnerAlreadyPresent = false;
  }

  /**
   * Perform basic validations on user data before recovery procedures.
   *
   * @returns {Promise<Void>}
   *
   * @private
   */
  async _basicValidations() {
    const oThis = this;

    await super._basicValidations();

    // Check for same old and new recovery owner addresses
    if (oThis.userData.recoveryOwnerAddress === oThis.newRecoveryOwnerAddress) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_u_r_ro_1',
          api_error_identifier: 'invalid_params',
          params_error_identifiers: ['same_new_and_old_recovery_owners'],
          debug_options: {}
        })
      );
    }
  }

  /**
   * Check if recovery operation can be performed or not.
   *
   * @returns {Promise<Void>}
   *
   * @private
   */
  async _canPerformRecoveryOperation() {
    const oThis = this;

    // Fetch all recovery operations of user
    const recoveryOperationObj = new RecoveryOperationModelKlass(),
      recoveryOperations = await recoveryOperationObj.getPendingOperationsOfTokenUser(oThis.tokenId, oThis.userId);

    for (let index in recoveryOperations) {
      const operation = recoveryOperations[index];

      // Another in progress operation is present.
      if (
        operation.status == recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.inProgressStatus]
      ) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'a_s_u_r_ro_5',
            api_error_identifier: 'another_recovery_operation_in_process',
            debug_options: {}
          })
        );
      }
    }
  }

  /**
   * Validate input addresses with recovery owners statuses
   *
   * @returns {Promise<never>}
   *
   * @private
   */
  async _validateAddressStatuses() {
    const oThis = this;
    // Device validation is not required for this service.
    // Instead of that we are checking for recovery owners

    let recoveryOwnersCacheResp = await oThis._fetchRecoveryOwners();

    if (
      !CommonValidators.validateObject(recoveryOwnersCacheResp[oThis.userData.recoveryOwnerAddress]) ||
      recoveryOwnersCacheResp[oThis.userData.recoveryOwnerAddress].status !== recoveryOwnerConstants.authorizedStatus
    ) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_u_r_ro_2',
          api_error_identifier: 'invalid_params',
          params_error_identifiers: ['action_not_performed_contact_support'],
          debug_options: {}
        })
      );
    }

    // New Recovery owner would not be present first time and if its present then it should be in Authorization failed state
    // Authorization failed state means last attempt failed so user is retyring now.
    oThis.newRecoveryOwnerAlreadyPresent = CommonValidators.validateObject(
      recoveryOwnersCacheResp[oThis.newRecoveryOwnerAddress]
    );
    if (
      oThis.newRecoveryOwnerAlreadyPresent &&
      recoveryOwnersCacheResp[oThis.newRecoveryOwnerAddress].status !== recoveryOwnerConstants.authorizationFailedStatus
    ) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_u_r_ro_3',
          api_error_identifier: 'invalid_params',
          params_error_identifiers: ['action_not_performed_contact_support'],
          debug_options: {}
        })
      );
    }
  }

  /**
   * Reset recovery owner for user.
   *
   * @returns {Promise<never>}
   *
   * @private
   */
  async _performRecoveryOperation() {
    const oThis = this;

    await oThis._createUpdateRecoveryOwners();

    const recOperation = await new RecoveryOperationModelKlass()
      .insert({
        token_id: oThis.tokenId,
        user_id: oThis.userId,
        kind: recoveryOperationConstants.invertedKinds[recoveryOperationConstants.pinResetByUserKind],
        status: recoveryOperationConstants.invertedStatuses[recoveryOperationConstants.inProgressStatus]
      })
      .fire();

    // Start Reset Recovery owner workflow
    await oThis._startResetRecoveryOwnerWorkflow(recOperation.insertId);
  }

  /**
   * Start reset recovery owner workflow.
   *
   * @param {String/Number} recoveryOperationId
   *
   * @return {Promise<never>}
   *
   * @private
   */
  async _startResetRecoveryOwnerWorkflow(recoveryOperationId) {
    const oThis = this;

    const requestParams = {
        auxChainId: oThis.auxChainId,
        tokenId: oThis.tokenId,
        userId: oThis.userId,
        oldRecoveryOwnerAddress: oThis.userData.recoveryOwnerAddress,
        newRecoveryOwnerAddress: oThis.newRecoveryOwnerAddress,
        signature: oThis.signature,
        recoveryOwnerShardNumber: oThis.userData.recoveryOwnerShardNumber,
        recoveryAddress: oThis.recoveryContractAddress,
        recoveryOperationId: recoveryOperationId
      },
      initParams = {
        stepKind: workflowStepConstants.resetRecoveryOwnerInit,
        taskStatus: workflowStepConstants.taskReadyToStart,
        clientId: oThis.clientId,
        chainId: oThis.auxChainId,
        topic: workflowTopicConstants.resetRecoveryOwner,
        requestParams: requestParams
      };

    const resetRecoveryOwnerRouterObj = new ResetRecoveryOwnerRouter(initParams),
      response = await resetRecoveryOwnerRouterObj.perform();

    if (response.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_r_ro_4',
          api_error_identifier: 'action_not_performed_contact_support',
          debug_options: {}
        })
      );
    }
  }

  /**
   * Fetch devices from cache.
   *
   * @returns {Promise<*>}
   *
   * @private
   */
  async _fetchRecoveryOwners() {
    const oThis = this;

    const RecoveryOwnerDetailCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'RecoveryOwnerDetailCache'),
      recoveryOwnerCache = new RecoveryOwnerDetailCache({
        userId: oThis.userId,
        tokenId: oThis.tokenId,
        recoveryOwnerAddresses: [oThis.userData.recoveryOwnerAddress, oThis.newRecoveryOwnerAddress],
        shardNumber: oThis.userData.recoveryOwnerShardNumber
      }),
      response = await recoveryOwnerCache.fetch();

    if (response.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_r_ro_6',
          api_error_identifier: 'cache_issue',
          debug_options: {}
        })
      );
    }

    return response.data;
  }

  /**
   * Create new recovery owner and update status of old recovery owner address.
   *
   * @return {Promise<never>}
   *
   * @private
   */
  async _createUpdateRecoveryOwners() {
    const oThis = this,
      RecoveryOwnerModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'RecoveryOwner');

    const promises = [];

    let ddbQueryFailed = false,
      recoveryOwnerModelObj = new RecoveryOwnerModel({ shardNumber: oThis.userData.recoveryOwnerShardNumber });

    // If new recovery owner is already present then update
    let newRecoveryOwnerPromise = null;
    if (oThis.newRecoveryOwnerAlreadyPresent) {
      newRecoveryOwnerPromise = recoveryOwnerModelObj.updateStatusFromInitialToFinal(
        oThis.userId,
        oThis.newRecoveryOwnerAddress,
        recoveryOwnerConstants.authorizationFailedStatus,
        recoveryOwnerConstants.authorizingStatus
      );
    } else {
      newRecoveryOwnerPromise = recoveryOwnerModelObj.createRecoveryOwner({
        userId: oThis.userId,
        address: oThis.newRecoveryOwnerAddress,
        status: recoveryOwnerConstants.authorizingStatus
      });
    }

    // Create new recovery owner with status as authorizing.
    promises.push(
      new Promise(function(onResolve, onReject) {
        newRecoveryOwnerPromise
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

    recoveryOwnerModelObj = new RecoveryOwnerModel({ shardNumber: oThis.userData.recoveryOwnerShardNumber });

    // Update status of oldRecoveryOwnerAddress to revokingStatus from authorizedStatus.
    promises.push(
      new Promise(function(onResolve, onReject) {
        recoveryOwnerModelObj
          .updateStatusFromInitialToFinal(
            oThis.userId,
            oThis.userData.recoveryOwnerAddress,
            recoveryOwnerConstants.authorizedStatus,
            recoveryOwnerConstants.revokingStatus
          )
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

    await Promise.all(promises);

    // If ddb query is failed. Then reject reset recovery owner request.
    if (ddbQueryFailed) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_r_ro_7',
          api_error_identifier: 'action_not_performed_contact_support',
          debug_options: {}
        })
      );
    }
  }

  /**
   * Return recovery owner entity.
   *
   * @returns {Promise<>}
   *
   * @private
   */
  async _returnResponse() {
    const oThis = this;

    return Promise.resolve(
      responseHelper.successWithData({
        [resultType.recoveryOwner]: {
          userId: oThis.userId,
          address: oThis.newRecoveryOwnerAddress,
          status: recoveryOwnerConstants.invertedRecoveryOwnerStatuses[recoveryOwnerConstants.authorizingStatus],
          updatedTimestamp: basicHelper.getCurrentTimestampInSeconds()
        }
      })
    );
  }
}

InstanceComposer.registerAsShadowableClass(ResetRecoveryOwner, coreConstants.icNameSpace, 'ResetRecoveryOwner');

module.exports = {};
