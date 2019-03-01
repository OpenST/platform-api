'use strict';
/**
 * Activate gateway contract
 *
 * @module lib/setup/economy/ActivateGateway
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  shardConstant = require(rootPrefix + '/lib/globalConstant/shard'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  ClientPreProvisioning = require(rootPrefix + '/app/models/mysql/ClientPreProvisioning');

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

    oThis.configStrategyObj = null;
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

    let response = await oThis._decideShards();

    if (response.isFailure()) {
      return responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskFailed
      });
    }

    response = await oThis._assignShards();

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
      let oneShardProvisioningMissing =
        !oThis.preProvisioningInfo.hasOwnProperty('token_users_shard_number') ||
        !oThis.preProvisioningInfo.hasOwnProperty('balance_shard_number');

      if (oneShardProvisioningMissing) {
        return responseHelper.error({
          internal_error_identifier: 'l_e_asfc_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { preProvisioningInfo: oThis.preProvisioningInfo }
        });
      }

      oThis.shardNumbersMap[shardConstant.userEntityKind] = oThis.preProvisioningInfo.token_users_shard_number;
      oThis.shardNumbersMap[shardConstant.balanceEntityKind] = oThis.preProvisioningInfo.balance_shard_number;

      return responseHelper.successWithData({});
    }

    let AvailableShardCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'AvailableShardsCache'),
      availableShardCache = new AvailableShardCache();

    let response = await availableShardCache.fetch(),
      allAvailableShards = response.data,
      availableShardsForChain = allAvailableShards[oThis._configStrategyObject.auxChainId];

    if (basicHelper.isEmptyObject(allAvailableShards) || basicHelper.isEmptyObject(availableShardsForChain)) {
      return responseHelper.error({
        internal_error_identifier: 'l_e_asfc_2',
        api_error_identifier: 'something_went_wrong',
        debug_options: { allAvailableShards: allAvailableShards, availableShardsForChain: availableShardsForChain }
      });
    }

    oThis.shardNumbersMap[shardConstant.userEntityKind] =
      availableShardsForChain[shardConstant.userEntityKind][
        oThis.clientId % availableShardsForChain[shardConstant.userEntityKind].length
      ];

    oThis.shardNumbersMap[shardConstant.balanceEntityKind] =
      availableShardsForChain[shardConstant.balanceEntityKind][
        oThis.clientId % availableShardsForChain[shardConstant.balanceEntityKind].length
      ];

    return responseHelper.successWithData({});
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

    await shardByToken.insertShardByTokens({
      entityKind: shardConstant.userEntityKind,
      tokenId: oThis.tokenId,
      shardNumber: oThis.shardNumbersMap[shardConstant.userEntityKind]
    });

    await shardByToken.insertShardByTokens({
      entityKind: shardConstant.balanceEntityKind,
      tokenId: oThis.tokenId,
      shardNumber: oThis.shardNumbersMap[shardConstant.balanceEntityKind]
    });

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
