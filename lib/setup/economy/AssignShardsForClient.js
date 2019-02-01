'use strict';
/**
 * Activate gateway contract
 *
 * @module lib/setup/economy/ActivateGateway
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  shardConstant = require(rootPrefix + '/lib/globalConstant/shard'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  ClientPreProvisioning = require(rootPrefix + '/app/models/mysql/ClientPreProvisoning');

require(rootPrefix + '/app/models/ddb/shared/ShardByToken');
require(rootPrefix + '/lib/cacheManagement/shared/AvailableShard');

class AssignShardsForClient {
  /**
   * Constructor to activate gateway contract.
   *
   * @param {Object} params
   * @param {Number} params.clientId
   * @param {Number} params.tokenId
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.clientId = params.clientId;
    oThis.tokenId = params.tokenId;
  }

  /**
   * Perform
   *
   * @return {Promise<result>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error(`${__filename}::perform::catch`);
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'l_s_e_asfc_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * Async performer
   *
   * @private
   *
   * @return {Promise<result>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._getPreProvisioningInfo();

    await oThis._decideShards();

    let response = await oThis._assignShards();

    return responseHelper.successWithData({
      taskStatus: workflowStepConstants.taskDone
    });
  }

  /**
   * _getPreProvisioningInfo - Gets the shard pre-provisioning info of a client
   *
   * @return {Promise<void>}
   * @private
   */
  async _getPreProvisioningInfo() {
    const oThis = this;

    let clientPreProvisioning = new ClientPreProvisioning();

    let response = await clientPreProvisioning.getDetailsByClientId(oThis.clientId);

    oThis.preProvisioningInfo = response.data.config;
  }

  /**
   * _decideShards - Decides which shards to assign for the client
   *
   * @return {Promise<void>}
   * @private
   */
  async _decideShards() {
    const oThis = this;

    oThis.shardNumbersMap = {};

    if (oThis.preProvisioningInfo) {
      oThis.shardNumbersMap[shardConstant.userEntityKind] = oThis.preProvisioningInfo.user;
      oThis.shardNumbersMap[shardConstant.deviceEntityKind] = oThis.preProvisioningInfo.device;
      oThis.shardNumbersMap[shardConstant.recoveryAddressEntityKind] = oThis.preProvisioningInfo.recoveryAddress;
      oThis.shardNumbersMap[shardConstant.sessionEntityKind] = oThis.preProvisioningInfo.session;

      return;
    }

    let AvailableShardCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'AvailableShardsCache'),
      availableShardCache = new AvailableShardCache();

    let response = await availableShardCache.fetch(),
      availableShards = response.data;

    oThis.shardNumbersMap[shardConstant.userEntityKind] =
      availableShards.user[oThis.clientId % availableShards.user.length];
    oThis.shardNumbersMap[shardConstant.deviceEntityKind] =
      availableShards.device[oThis.clientId % availableShards.device.length];
    oThis.shardNumbersMap[shardConstant.recoveryAddressEntityKind] =
      availableShards.recoveryAddress[oThis.clientId % availableShards.recoveryAddress.length];
    oThis.shardNumbersMap[shardConstant.sessionEntityKind] =
      availableShards.session[oThis.clientId % availableShards.session.length];
  }

  /**
   * _assignShards - assign shards for client
   *
   * @return {Promise<void>}
   * @private
   */
  async _assignShards() {
    const oThis = this;

    let ShardByToken = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardByTokenModel'),
      shardByToken = new ShardByToken({});

    for (let entityKind in shardConstant.invertedEntityKinds) {
      await shardByToken.insertShardByTokens({
        entityKind: entityKind,
        tokenId: oThis.tokenId,
        shardNumber: oThis.shardNumbersMap[entityKind]
      });
    }

    return responseHelper.successWithData({});
  }

  /**
   * Config strategy
   *
   * @return {Object}
   */
  get _configStrategy() {
    const oThis = this;

    return oThis.ic().configStrategy;
  }

  /**
   * Object of config strategy class
   *
   * @return {Object}
   */
  get _configStrategyObject() {
    const oThis = this;

    if (oThis.configStrategyObj) return oThis.configStrategyObj;

    oThis.configStrategyObj = new ConfigStrategyObject(oThis._configStrategy);

    return oThis.configStrategyObj;
  }
}

InstanceComposer.registerAsShadowableClass(AssignShardsForClient, coreConstants.icNameSpace, 'AssignShardsForClient');

module.exports = AssignShardsForClient;
