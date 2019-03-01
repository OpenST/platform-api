'use strict';
/**
 * This service helps in adding Token holders in our System.
 *
 * @module app/services/user/CreateTokenHolder
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  workflowTopicConstants = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  UserSetupRouter = require(rootPrefix + '/executables/auxWorkflowRouter/UserSetupRouter');

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/models/ddb/sharded/User');
require(rootPrefix + '/app/models/ddb/sharded/Device');
require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');
require(rootPrefix + '/lib/cacheManagement/chainMulti/DeviceDetail');

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

    let fetchCacheRsp = await oThis._fetchClientConfigStrategy(oThis.clientId);
    oThis.auxChainId = fetchCacheRsp.data[oThis.clientId].chainId;

    await oThis._fetchTokenDetails();

    await oThis._fetchTokenUsersShards();

    await oThis._getUserDeviceDataFromCache();

    await oThis._updateUserStatusToActivating();

    await oThis._updateDeviceStatusToAuthorising().catch(async function(error) {
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
   * Fetch token user shards: Fetch token user shards from cache.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchTokenUsersShards() {
    const oThis = this;

    let TokenShardNumbersCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenShardNumbersCache');
    let tokenShardNumbersCache = new TokenShardNumbersCache({
      tokenId: oThis.tokenId
    });

    let response = await tokenShardNumbersCache.fetch();

    oThis.userShardNumber = response.data.user;
  }

  /**
   * Get user device details from Cache.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _getUserDeviceDataFromCache() {
    const oThis = this;

    let DeviceDetailCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceDetailCache'),
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

    let deviceDetails = response.data[oThis.deviceAddress.toLowerCase()];
    if (basicHelper.isEmptyObject(deviceDetails) || deviceDetails.status != deviceConstants.registeredStatus) {
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
    let deviceStatusUpdateResponse = await deviceModel.updateStatusFromInitialToFinal(
      oThis.userId,
      oThis.deviceAddress,
      deviceConstants.registeredStatus,
      deviceConstants.authorisingStatus
    );

    if (deviceStatusUpdateResponse.isFailure() || !deviceStatusUpdateResponse.data.deviceUuid) {
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

    logger.log('Device status is registered.');
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
        sessionExpiration: oThis.expirationHeight
      },
      userSetupInitParams = {
        stepKind: workflowStepConstants.userSetupInit,
        taskStatus: workflowStepConstants.taskReadyToStart,
        clientId: oThis.clientId,
        chainId: oThis.auxChainId,
        topic: workflowTopicConstants.userSetup,
        requestParams: requestParams
      };

    const userSetupObj = new UserSetupRouter(userSetupInitParams);

    let response = await userSetupObj.perform();

    if (response.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_cth_5',
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

    let userStatusRollbackResponse = await userModel.updateStatus({
      tokenId: oThis.tokenId,
      userId: oThis.userId,
      status: tokenUserConstants.createdStatus
    });

    if (userStatusRollbackResponse.isFailure()) {
      logger.error('Could not rollback user status back to created. ');
      logger.notify(
        'a_s_u_cth_6',
        'Could not rollback user status back to created. TokenId: ',
        oThis.tokenId,
        ' UserId: ',
        oThis.userId
      );
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
