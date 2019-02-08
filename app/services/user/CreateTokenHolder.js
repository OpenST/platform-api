'use strict';
/**
 * This service helps in adding Token holders in our System.
 *
 * @module app/services/user/CreateTokenHolder
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser');

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/models/ddb/sharded/User');
require(rootPrefix + '/app/models/ddb/sharded/Device');
require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');

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
   * @param {Number} params.device_address: device address
   * @param {Array} params.session_addresses: session address
   * @param {String/Number} params.expiration_height: expiration height
   * @param {String/Number} params.spending_limit: spending limit
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.userId = params.user_id;
    oThis.clientId = params.client_id;
    oThis.deviceAddress = params.device_address;
    oThis.sessionAddresses = params.session_addresses;
    oThis.expirationHeight = params.expiration_height;
    oThis.spendingLimit = params.spending_limit;

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

    await oThis._fetchTokenDetails();

    await oThis._fetchTokenUsersShards();

    await oThis._updateUserStatusToActivating();

    await oThis._validateDeviceAddressStatus().catch(async function() {
      await oThis._rollbackUserStatusToCreated();
    });

    return Promise.resolve(
      responseHelper.successWithData({
        [resultType.user]: {
          userId: 'test123',
          tokenId: 'test123',
          tokenHolderAddress: 'test123',
          multisigAddress: 'test123',
          kind: '1',
          updatedTimestamp: 'test123',
          status: '2'
        }
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
    let userStatusUpdateResponse = await userModel.updateStatusFromCreatedToActivating(oThis.tokenId, oThis.userId);

    if (userStatusUpdateResponse.isFailure()) {
      logger.error('Could not update user status from created to activating.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_cth_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    logger.log('User status updated to activating.');
    oThis.deviceShardNumber = userStatusUpdateResponse.data.deviceShardNumber;
  }

  /**
   * Validate whether the device address is registered or not.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _validateDeviceAddressStatus() {
    const oThis = this,
      DeviceModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceModel'),
      deviceModel = new DeviceModel({
        shardNumber: oThis.deviceShardNumber
      });

    logger.log('Fetching device details.');
    let deviceDetails = await deviceModel.getDeviceDetails({
      userId: oThis.userId,
      walletAddresses: [oThis.deviceAddress]
    });

    if (deviceDetails.isFailure()) {
      logger.error('Could not fetch device details.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_cth_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    if (!deviceDetails.data[oThis.deviceAddress]) {
      logger.error('Invalid device address.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_cth_4',
          api_error_identifier: 'invalid_device_address',
          debug_options: {}
        })
      );
    }

    logger.log('Checking if device status is registered or not.');
    let deviceCurrentStatus = deviceDetails.data[oThis.deviceAddress].status;

    if (deviceCurrentStatus !== deviceConstants.registeredStatus) {
      logger.error('Status of device address is not registered. Current status is: ', deviceCurrentStatus);
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_cth_5',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    logger.log('Device status is registered.');
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
          internal_error_identifier: 'a_s_u_cth_7',
          api_error_identifier: 'something_went_wrong',
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
