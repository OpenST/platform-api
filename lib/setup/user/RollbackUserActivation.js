'use strict';
/**
 * This module helps to rollback user, device and sessions statuses in case of failure.
 *
 * @module lib/setup/user/RollbackUserActivation
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device');

require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');
require(rootPrefix + '/app/models/ddb/sharded/User');
require(rootPrefix + '/app/models/ddb/sharded/Device');
require(rootPrefix + '/app/models/ddb/sharded/Session');

/**
 * Class for activating user
 *
 * @class
 */
class RollbackUserActivation {
  /**
   * Constructor for adding user in UserWalletFactory
   *
   * @param {Object} params
   * @param {String} params.auxChainId: auxChainId for which token rules needs be deployed.
   * @param {String} params.tokenId: tokenId of which User Wallet Factory would be used.
   * @param {String} params.userId: userId which has to be added in wallet factory.
   * @param {String} params.deviceAddress: deviceAddress which has to be added in wallet factory.
   * @param {String} params.sessionAddresses: sessionAddresses which has to be added in wallet factory.
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.tokenId = params.tokenId;
    oThis.userId = params.userId;
    oThis.deviceAddress = params.deviceAddress;
    oThis.sessionAddresses = params.sessionAddresses;

    oThis.rollbackFailed = false;
    oThis.userShardNumber = null;
    oThis.deviceShardNumber = null;
    oThis.sessionShardNumber = null;
  }

  /**
   * Perform
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async perform() {
    const oThis = this;

    await oThis._fetchTokenUsersShards();

    await oThis._rollbackUser();

    // If user rollback failed then stop the process.
    if (oThis.rollbackFailed) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskFailed,
          taskResponseData: {
            description: 'User Rollback Failed.'
          }
        })
      );
    }

    let promisesArray = [];

    promisesArray.push(oThis._deleteSessionAddresses());

    if (oThis.deviceAddress) {
      promisesArray.push(oThis._rollbackDeviceStatus());
    }

    await Promise.all(promisesArray);

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone,
        taskResponseData: {
          description: 'Token Holder deployment rollbacked.'
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
    const oThis = this,
      TokenShardNumbersCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenShardNumbersCache'),
      tokenShardNumbersCache = new TokenShardNumbersCache({
        tokenId: oThis.tokenId
      });

    let response = await tokenShardNumbersCache.fetch();

    oThis.userShardNumber = response.data.user;
  }

  /**
   * Delete session addresses
   *
   * @return {Array<Promise>}
   * @private
   */
  _deleteSessionAddresses() {
    const oThis = this;

    let deleteParams = [],
      SessionModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionModel');
    for (let index in oThis.sessionAddresses) {
      let address = oThis.sessionAddresses[index];
      deleteParams.push({
        userId: oThis.userId,
        address: address
      });
    }
    new SessionModel({
      shardNumber: oThis.sessionShardNumber
    }).batchDeleteItem(deleteParams);
  }

  /**
   * Rollback Device To Created State
   *
   * @return {Promise<void>}
   * @private
   */
  _rollbackDeviceStatus() {
    const oThis = this,
      DeviceModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceModel'),
      deviceModelObj = new DeviceModel({
        shardNumber: oThis.deviceShardNumber
      });
    let updateParams = {
      walletAddress: oThis.deviceAddress,
      userId: oThis.userId,
      status: deviceConstants.registeredStatus
    };
    return deviceModelObj.updateItem(updateParams);
  }

  /**
   * Rollback user status to Created.
   *
   * @return {Promise<void>}
   * @private
   */
  async _rollbackUser() {
    const oThis = this,
      UserModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserModel'),
      userModelObj = new UserModel({
        shardNumber: oThis.userShardNumber
      });

    let updateParams = {
      tokenId: oThis.tokenId,
      userId: oThis.userId,
      status: tokenUserConstants.createdStatus
    };

    let response = await userModelObj.updateItem(updateParams, null, 'ALL_NEW');
    if (response.isFailure()) {
      oThis.rollbackFailed = true;
    } else {
      let updatedData = userModelObj._formatRowFromDynamo(response.data.Attributes);
      oThis.deviceShardNumber = updatedData.deviceShardNumber;
      oThis.sessionShardNumber = updatedData.sessionShardNumber;
    }

    return responseHelper.successWithData();
  }
}

InstanceComposer.registerAsShadowableClass(RollbackUserActivation, coreConstants.icNameSpace, 'RollbackUserActivation');

module.exports = {};
