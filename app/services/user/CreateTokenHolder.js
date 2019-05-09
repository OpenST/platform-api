/**
 * This service helps in adding Token holders in our System.
 *
 * @module app/services/user/CreateTokenHolder
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  UserSetupRouter = require(rootPrefix + '/lib/workflow/userSetup/Router'),
  ErrorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  recoveryOwnerConstants = require(rootPrefix + '/lib/globalConstant/recoveryOwner'),
  sessionConstants = require(rootPrefix + '/lib/globalConstant/session'),
  workflowTopicConstants = require(rootPrefix + '/lib/globalConstant/workflowTopic');

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/models/ddb/sharded/User');
require(rootPrefix + '/app/models/ddb/sharded/Device');
require(rootPrefix + '/app/models/ddb/sharded/RecoveryOwner');
require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');
require(rootPrefix + '/lib/cacheManagement/chainMulti/DeviceDetail');
require(rootPrefix + '/lib/cacheManagement/shared/BlockTimeDetails');

/**
 * Class for creating token holder for user.
 *
 * @class
 */
class CreateTokenHolder extends ServiceBase {
  /**
   * Constructor for creating token holder for user.
   *
   * @param params
   * @param {String} params.user_id: user Id
   * @param {Number} params.client_id: client Id
   * @param {String} params.device_address: device address
   * @param {String} params.recovery_owner_address: Recovery owner address
   * @param {Array} params.session_addresses: session addresses
   * @param {Number} params.expiration_height: expiration height
   * @param {String} params.spending_limit: spending limit
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.userId = params.user_id;
    oThis.clientId = params.client_id;
    oThis.deviceAddress = params.device_address;
    oThis.recoveryOwnerAddress = params.recovery_owner_address;
    oThis.sessionAddresses = params.session_addresses;
    oThis.expirationHeight = params.expiration_height;
    oThis.spendingLimit = params.spending_limit;

    oThis.auxChainId = null;
    oThis.userShardNumber = null;
    oThis.deviceShardNumber = null;
    oThis.recoveryOwnerShardNumber = null;
  }

  /**
   * Async performer
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    oThis._sanitize();

    const fetchCacheRsp = await oThis._fetchClientConfigStrategy(oThis.clientId);
    oThis.auxChainId = fetchCacheRsp.data[oThis.clientId].chainId;

    await oThis._validateTokenStatus();

    await oThis._validateExpirationHeight();

    await oThis._fetchTokenUsersShards();

    await oThis._getUserDeviceDataFromCache();

    await oThis._updateUserStatusToActivating();

    await oThis._updateDeviceStatusToAuthorising().catch(async function(error) {
      await oThis._rollbackUserStatusToCreated();

      return Promise.reject(error);
    });

    await oThis._authorizingRecoveryOwnerAddress().catch(async function(error) {
      await oThis._rollbackDeviceStatusToRegistered();
      await oThis._rollbackUserStatusToCreated();

      return Promise.reject(error);
    });

    await oThis._initUserSetupWorkflow();

    return Promise.resolve(
      responseHelper.successWithData({
        [resultType.user]: oThis.userStatusUpdateResponse.data
      })
    );
  }

  /**
   * Sanitize input parameters.
   *
   * @private
   */
  _sanitize() {
    const oThis = this;

    oThis.deviceAddress = oThis.deviceAddress.toLowerCase();
    oThis.recoveryOwnerAddress = oThis.recoveryOwnerAddress.toLowerCase();

    const sanitizedSessionAddresses = [];
    for (let index = 0; index < oThis.sessionAddresses.length; index++) {
      sanitizedSessionAddresses.push(oThis.sessionAddresses[index].toLowerCase());
    }

    oThis.sessionAddresses = sanitizedSessionAddresses;
  }

  /**
   * Validate expiration height
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _validateExpirationHeight() {
    const oThis = this,
      BlockTimeDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BlockTimeDetailsCache'),
      blockTimeDetailsCache = new BlockTimeDetailsCache({ chainId: oThis.auxChainId });

    let block = await blockTimeDetailsCache.fetch();

    let currentBlock = Number(block.data.block),
      minExpirationBlocks = Math.floor(
        sessionConstants.sessionKeyExpirationMinimumTime / (Number(block.data.blockGenerationTime) * 1000)
      );

    if (currentBlock + minExpirationBlocks >= oThis.expirationHeight) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_cth_9',
          api_error_identifier: 'invalid_expiration_height',
          debug_options: {}
        })
      );
    }
  }

  /**
   * Fetch token user shards: Fetch token user shards from cache.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchTokenUsersShards() {
    const oThis = this;

    const TokenShardNumbersCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenShardNumbersCache'),
      tokenShardNumbersCache = new TokenShardNumbersCache({
        tokenId: oThis.tokenId
      });

    const response = await tokenShardNumbersCache.fetch();

    oThis.userShardNumber = response.data.user;
  }

  /**
   * Get user device details from Cache.
   *
   * @returns {Promise<*>}
   *
   * @private
   */
  async _getUserDeviceDataFromCache() {
    const oThis = this;

    const DeviceDetailCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceDetailCache'),
      deviceDetailCache = new DeviceDetailCache({
        userId: oThis.userId,
        tokenId: oThis.tokenId,
        walletAddresses: [oThis.deviceAddress.toLowerCase()]
      }),
      response = await deviceDetailCache.fetch();

    if (response.isFailure()) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_u_cth_1',
          api_error_identifier: 'user_activation_failed',
          params_error_identifiers: ['user_activation_failed_invalid_device'],
          debug_options: {}
        })
      );
    }

    const deviceDetails = response.data[oThis.deviceAddress.toLowerCase()];
    if (basicHelper.isEmptyObject(deviceDetails) || deviceDetails.status !== deviceConstants.registeredStatus) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_u_cth_2',
          api_error_identifier: 'user_activation_failed',
          params_error_identifiers: ['user_activation_failed_invalid_device'],
          debug_options: {}
        })
      );
    }

    return response;
  }

  /**
   * Update user status from created to activating after performing certain validations.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _updateUserStatusToActivating() {
    const oThis = this,
      UserModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserModel'),
      userModel = new UserModel({
        shardNumber: oThis.userShardNumber
      });

    logger.log('Updating user status from created to activating.');

    oThis.userStatusUpdateResponse = await userModel.updateStatusFromInitialToFinal(
      oThis.tokenId,
      oThis.userId,
      tokenUserConstants.createdStatus,
      tokenUserConstants.activatingStatus
    );

    if (oThis.userStatusUpdateResponse.isFailure()) {
      logger.error('Could not update user status from created to activating.');

      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_u_cth_3',
          api_error_identifier: 'user_activation_failed',
          params_error_identifiers: ['user_activation_failed_invalid_user'],
          debug_options: {}
        })
      );
    }

    logger.log('User status updated to activating.');
    oThis.deviceShardNumber = oThis.userStatusUpdateResponse.data.deviceShardNumber;
    oThis.recoveryOwnerShardNumber = oThis.userStatusUpdateResponse.data.recoveryOwnerShardNumber;
  }

  /**
   * Validate whether the device address is registered or not.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _updateDeviceStatusToAuthorising() {
    const oThis = this,
      DeviceModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceModel'),
      deviceModel = new DeviceModel({
        shardNumber: oThis.deviceShardNumber
      });

    logger.log('Updating device details.');

    const deviceStatusUpdateResponse = await deviceModel.updateStatusFromInitialToFinal(
      oThis.userId,
      oThis.deviceAddress,
      deviceConstants.registeredStatus,
      deviceConstants.authorizingStatus
    );

    if (deviceStatusUpdateResponse.isFailure()) {
      logger.error('Could not update device status from registered to authorising.');

      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_u_cth_4',
          api_error_identifier: 'user_activation_failed',
          params_error_identifiers: ['user_activation_failed_invalid_device'],
          debug_options: {}
        })
      );
    }

    logger.log('Device status is authorizing.');
  }

  /**
   * Create an entry in recovery owner address shard with status as AUTHORIZING.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _authorizingRecoveryOwnerAddress() {
    const oThis = this,
      RecoveryOwnerModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'RecoveryOwner'),
      recoveryOwnerModel = new RecoveryOwnerModel({
        shardNumber: oThis.recoveryOwnerShardNumber
      });

    logger.log('Authorizing recovery owner address.');

    const recoveryOwnerCreationResponse = await recoveryOwnerModel.createRecoveryOwner({
      userId: oThis.userId,
      address: oThis.recoveryOwnerAddress,
      status: recoveryOwnerConstants.authorizingStatus
    });

    if (recoveryOwnerCreationResponse.isFailure()) {
      logger.error('Could not create recovery owner address with status authorizing.');

      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_u_cth_5',
          api_error_identifier: 'user_activation_failed',
          params_error_identifiers: ['user_activation_failed_invalid_recovery_owner_address'],
          debug_options: {}
        })
      );
    }

    logger.log('Recovery owner address is authorizing.');
  }

  /**
   * Init user set-up workflow.
   *
   * @return {Promise<never>}
   *
   * @private
   */
  async _initUserSetupWorkflow() {
    const oThis = this;

    const requestParams = {
        auxChainId: oThis.auxChainId,
        tokenId: oThis.tokenId,
        userId: oThis.userId,
        deviceAddress: oThis.deviceAddress,
        recoveryOwnerAddress: oThis.recoveryOwnerAddress,
        sessionAddresses: oThis.sessionAddresses,
        sessionSpendingLimit: oThis.spendingLimit,
        sessionExpiration: oThis.expirationHeight,
        delayedRecoveryInterval: oThis.delayedRecoveryInterval
      },
      userSetupInitParams = {
        stepKind: workflowStepConstants.userSetupInit,
        taskStatus: workflowStepConstants.taskReadyToStart,
        clientId: oThis.clientId,
        chainId: oThis.auxChainId,
        topic: workflowTopicConstants.userSetup,
        requestParams: requestParams
      };

    const userSetupObj = new UserSetupRouter(userSetupInitParams),
      response = await userSetupObj.perform();

    if (response.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_cth_6',
          api_error_identifier: 'action_not_performed_contact_support',
          debug_options: {}
        })
      );
    }
  }

  /**
   * Rollback user status back to created.
   *
   * @return {Promise<never>}
   *
   * @private
   */
  async _rollbackUserStatusToCreated() {
    const oThis = this,
      UserModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserModel'),
      userModel = new UserModel({
        shardNumber: oThis.userShardNumber
      });

    logger.log('Faced an error while deploying token holder for user. Updating user status back to created.');

    const userStatusRollbackResponse = await userModel.updateStatus({
      tokenId: oThis.tokenId,
      userId: oThis.userId,
      status: tokenUserConstants.createdStatus
    });

    if (userStatusRollbackResponse.isFailure()) {
      logger.error('Could not rollback user status back to created. ');
      const errorObject = responseHelper.error({
        internal_error_identifier: 'user_status_rollback_failed:a_s_u_cth_7',
        api_error_identifier: 'action_not_performed_contact_support',
        debug_options: {
          tokenId: oThis.tokenId,
          userId: oThis.userId
        }
      });

      await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.mediumSeverity);

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_cth_7',
          api_error_identifier: 'action_not_performed_contact_support',
          debug_options: {}
        })
      );
    }
  }

  /**
   * Rollback device status back to registered.
   *
   * @return {Promise<never>}
   *
   * @private
   */
  async _rollbackDeviceStatusToRegistered() {
    const oThis = this,
      DeviceModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceModel'),
      deviceModel = new DeviceModel({
        shardNumber: oThis.deviceShardNumber
      });

    logger.log('Faced an error while deploying token holder for user. Updating device status back to registered.');

    const deviceStatusRollbackResponse = await deviceModel.updateStatus({
      walletAddress: oThis.deviceAddress,
      userId: oThis.userId,
      status: deviceConstants.registeredStatus
    });

    if (deviceStatusRollbackResponse.isFailure()) {
      logger.error('Could not rollback device status back to registered. ');
      const errorObject = responseHelper.error({
        internal_error_identifier: 'device_status_rollback_failed:a_s_u_cth_8',
        api_error_identifier: 'action_not_performed_contact_support',
        debug_options: {
          tokenId: oThis.tokenId,
          deviceAddress: oThis.deviceAddress,
          userId: oThis.userId
        }
      });

      await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.mediumSeverity);

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_cth_8',
          api_error_identifier: 'action_not_performed_contact_support',
          debug_options: {}
        })
      );
    }
  }

  /**
   * Subclass to return its own class here
   *
   * @returns {object}
   */
  get subClass() {
    return CreateTokenHolder;
  }
}

InstanceComposer.registerAsShadowableClass(CreateTokenHolder, coreConstants.icNameSpace, 'CreateTokenHolder');

module.exports = {};
