/**
 * Module to deploy token holder contract and activate user.
 *
 * @module lib/setup/user/ActivateUser
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device'),
  sessionConstants = require(rootPrefix + '/lib/globalConstant/session'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  recoveryOwnerConstants = require(rootPrefix + '/lib/globalConstant/recoveryOwner');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/app/models/ddb/sharded/User');
require(rootPrefix + '/app/models/ddb/sharded/Device');
require(rootPrefix + '/app/models/ddb/sharded/Session');
require(rootPrefix + '/app/models/ddb/sharded/RecoveryOwner');
require(rootPrefix + '/lib/cacheManagement/chainMulti/UserDetail');
require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');
require(rootPrefix + '/lib/cacheManagement/chain/PreviousOwnersMap');

/**
 * Class to deploy token holder contract and activate user.
 *
 * @class ActivateUser
 */
class ActivateUser {
  /**
   * Constructor to deploy token holder contract and activate user.
   *
   * @param {object} params
   * @param {string} params.auxChainId: auxChainId for which token rules needs be deployed.
   * @param {string} params.tokenId: tokenId of which User Wallet Factory would be used.
   * @param {string} params.userId: userId which has to be added in wallet factory.
   * @param {string} params.deviceAddress: deviceAddress which has to be added in wallet factory.
   * @param {string} [params.recoveryOwnerAddress]: recoveryOwnerAddress which would be used for recovery later.
   * @param {string} params.sessionAddresses: sessionAddresses which has to be added in wallet factory.
   * @param {string} params.tokenHolderAddress: Token Holder contract address which is deployed now.
   * @param {string} params.multiSigAddress: Multi Sig contract address which is deployed now.
   * @param {string} [params.recoveryAddress]: Recovery contract address which is deployed now.
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
    oThis.tokenHolderAddress = params.tokenHolderAddress;
    oThis.multiSigAddress = params.multiSigAddress;
    oThis.recoveryOwnerAddress = params.recoveryOwnerAddress;
    oThis.recoveryAddress = params.recoveryAddress;

    oThis.activationFailed = false;
    oThis.userShardNumber = null;
    oThis.deviceShardNumber = null;
    oThis.sessionShardNumber = null;
    oThis.recoveryOwnerShardNumber = null;
  }

  /**
   * Main performer for class.
   *
   * @return {Promise<void>}
   * @private
   */
  async perform() {
    const oThis = this;

    await oThis._fetchTokenUsersShards();

    await oThis._updateUserAddresses();

    await oThis._clearLinkedDeviceAddressCacheMap();

    // If user activation failed then stop the process.
    if (oThis.activationFailed) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskFailed,
          debugParams: {
            description: 'User Activation Failed.'
          }
        })
      );
    }

    const promisesArray = [];

    promisesArray.push(oThis._activateSessionAddresses());

    if (oThis.deviceAddress) {
      promisesArray.push(oThis._markDeviceAuthorized());
    }

    if (oThis.recoveryOwnerAddress) {
      promisesArray.push(oThis._markRecoveryOwnerAddressAuthorized());
    }

    await Promise.all(promisesArray);

    if (!oThis.activationFailed) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskDone,
          debugParams: {
            description: 'User Activated.'
          }
        })
      );
    }

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskFailed,
        debugParams: {
          description: 'User Activation Failed.'
        }
      })
    );
  }

  /**
   * Fetch token user shards from cache.
   *
   * @sets oThis.userShardNumber
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchTokenUsersShards() {
    const oThis = this,
      TokenShardNumbersCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenShardNumbersCache'),
      tokenShardNumbersCache = new TokenShardNumbersCache({
        tokenId: oThis.tokenId
      });

    const response = await tokenShardNumbersCache.fetch();

    oThis.userShardNumber = response.data.user;
  }

  /**
   * Activate session addresses of user.
   *
   * @return {array<Promise>}
   * @private
   */
  _activateSessionAddresses() {
    const oThis = this;

    const promises = [],
      SessionModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionModel');
    for (const index in oThis.sessionAddresses) {
      const address = oThis.sessionAddresses[index];
      promises.push(
        new Promise(function(onResolve) {
          const updateParams = {
            userId: oThis.userId,
            address: address,
            status: sessionConstants.authorizedStatus
          };
          new SessionModel({
            shardNumber: oThis.sessionShardNumber
          })
            .updateItem(updateParams)
            .then(function(resp) {
              if (resp.isFailure()) {
                oThis.activationFailed = true;
              }

              return onResolve();
            })
            .catch(function(error) {
              logger.error(error);
              oThis.activationFailed = true;

              return onResolve();
            });
        })
      );
    }

    return promises;
  }

  /**
   * Activate devices of user
   *
   * @sets oThis.activationFailed
   *
   * @return {Promise<void>}
   * @private
   */
  _markDeviceAuthorized() {
    const oThis = this,
      DeviceModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceModel'),
      deviceModelObj = new DeviceModel({
        shardNumber: oThis.deviceShardNumber
      });

    return new Promise(function(onResolve) {
      deviceModelObj
        .updateStatusFromInitialToFinal(
          oThis.userId,
          oThis.deviceAddress,
          deviceConstants.authorizingStatus,
          deviceConstants.authorizedStatus
        )
        .then(function(resp) {
          if (resp.isFailure()) {
            oThis.activationFailed = true;
          }

          return onResolve();
        })
        .catch(function(error) {
          logger.error(error);
          oThis.activationFailed = true;

          return onResolve();
        });
    });
  }

  /**
   * Mark recovery owner address as authorized.
   *
   * @return {Promise<any>}
   * @private
   */
  async _markRecoveryOwnerAddressAuthorized() {
    const oThis = this,
      RecoveryOwnerModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'RecoveryOwner'),
      recoveryOwnerModel = new RecoveryOwnerModel({
        shardNumber: oThis.recoveryOwnerShardNumber
      });

    return new Promise(function(onResolve) {
      recoveryOwnerModel
        .updateStatusFromInitialToFinal(
          oThis.userId,
          oThis.recoveryOwnerAddress,
          recoveryOwnerConstants.authorizingStatus,
          recoveryOwnerConstants.authorizedStatus
        )
        .then(function(resp) {
          if (resp.isFailure()) {
            oThis.activationFailed = true;
          }

          return onResolve();
        })
        .catch(function(error) {
          logger.error(error);
          oThis.activationFailed = true;

          return onResolve();
        });
    });
  }

  /**
   * Update token holder and multisig address of user
   *
   * @sets oThis.activationFailed, oThis.deviceShardNumber, oThis.sessionShardNumber
   *
   * @return {Promise<void>}
   * @private
   */
  async _updateUserAddresses() {
    const oThis = this,
      UserModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserModel'),
      userModelObj = new UserModel({
        shardNumber: oThis.userShardNumber
      });

    const updateParams = {
      tokenId: oThis.tokenId,
      userId: oThis.userId,
      tokenHolderAddress: oThis.tokenHolderAddress,
      tokenHolderStatus: tokenUserConstants.tokenHolderActiveStatus,
      multisigAddress: oThis.multiSigAddress,
      status: tokenUserConstants.activatedStatus
    };

    // NOTE: For company user, recovery owner address is not present
    if (oThis.recoveryOwnerAddress) {
      updateParams.recoveryOwnerAddress = oThis.recoveryOwnerAddress;
    }

    // NOTE: For company user, recovery address is not present
    if (oThis.recoveryAddress) {
      updateParams.recoveryAddress = oThis.recoveryAddress;
    }

    const response = await userModelObj.updateItem(updateParams, null, 'ALL_NEW');
    if (response.isFailure()) {
      oThis.activationFailed = true;
    } else {
      const updatedData = userModelObj._formatRowFromDynamo(response.data.Attributes);

      oThis.deviceShardNumber = updatedData.deviceShardNumber;
      oThis.sessionShardNumber = updatedData.sessionShardNumber;
      oThis.recoveryOwnerShardNumber = updatedData.recoveryOwnerShardNumber;

      const UserDetailCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserDetailCache');
      const userDetailCacheObj = new UserDetailCache({
        tokenHolderAddresses: [oThis.tokenHolderAddress],
        tokenId: oThis.tokenId
      });

      const cacheParamsToSet = {
        tid: { N: oThis.tokenId },
        uid: { S: oThis.userId },
        tha: { S: oThis.tokenHolderAddress }
      };

      const formattedCacheData = userModelObj._formatRowsFromDynamo([cacheParamsToSet], 'tokenHolderAddress');

      await userDetailCacheObj._setCache(oThis.tokenHolderAddress, formattedCacheData[oThis.tokenHolderAddress]);
    }

    return responseHelper.successWithData({});
  }

  /**
   * Clear linked device address map cache.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _clearLinkedDeviceAddressCacheMap() {
    const oThis = this,
      PreviousOwnersMapCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'PreviousOwnersMap'),
      previousOwnersMapObj = new PreviousOwnersMapCache({ userId: oThis.userId, tokenId: oThis.tokenId });

    await previousOwnersMapObj.clear();
  }
}

InstanceComposer.registerAsShadowableClass(ActivateUser, coreConstants.icNameSpace, 'ActivateUser');

module.exports = {};
