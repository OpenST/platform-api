'use strict';
/**
 * Model to get config groups.
 *
 * @module /app/models/mysql/ConfigGroups
 */

const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  configGroupConstants = require(rootPrefix + '/lib/globalConstant/configGroups'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base');

const dbName = 'saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment,
  isAvailableForAllocationEnum = {
    '0': configGroupConstants.notAvailableForAllocation,
    '1': configGroupConstants.availableForAllocation
  },
  invertedIsAvailableForAllocationEnum = util.invert(isAvailableForAllocationEnum);

class ConfigGroups extends ModelBase {
  constructor() {
    super({ dbName: dbName });
    const oThis = this;
    oThis.tableName = 'config_groups';
  }

  /**
   * Inserts record
   * @param params
   * @param chainId {Number} - chain id
   * @param groupId {Number} - group id
   * @returns {Promise<*>}
   */
  async insertRecord(params) {
    const oThis = this;

    // Perform validations.
    if (!params.hasOwnProperty('chainId') || !params.hasOwnProperty('groupId')) {
      throw 'Mandatory parameters are missing. Expected an object with the following keys: {chainId, groupId}';
    }

    await oThis._validateChainAndGroupIds(params.chainId, params.groupId);

    return await new ConfigGroups()
      .insert({
        chain_id: params.chainId,
        group_id: params.groupId
      })
      .fire();
  }

  /**
   * Check if the given chain id and group id is available for allocation
   *
   * @param chainId {Number} - chain id
   * @param groupId {Number} - group id
   * @returns {Promise<void>}
   */
  async isAvailableForAllocation(chainId, groupId) {
    const oThis = this;

    await oThis._validateChainAndGroupIds(chainId, groupId);

    let configRecord = await new ConfigGroups()
      .select(['id', 'is_available_for_allocation'])
      .where(['chain_id = ? AND group_id = ?', chainId, groupId])
      .fire();

    if (configRecord.length === 0) {
      logger.error('No entry found for given chainId and group Id');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_m_m_cg_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }
    let returnData = {
      id: configRecord[0].id,
      chainId: chainId,
      groupId: groupId,
      is_available_for_allocation: isAvailableForAllocationEnum[configRecord[0].is_available_for_allocation.toString()]
    };

    return Promise.resolve(responseHelper.successWithData(returnData));
  }

  /**
   * Marks the given chain id and group id available for allocation
   *
   * @param chainId {Number} - chain id
   * @param groupId {Number} - group id
   * @returns {Promise<*>}
   */
  async allocate(chainId, groupId) {
    const oThis = this;

    await oThis._validateChainAndGroupIds(chainId, groupId);

    return oThis
      .update({
        is_available_for_allocation: invertedIsAvailableForAllocationEnum[configGroupConstants.availableForAllocation]
      })
      .where({ chain_id: chainId, group_id: groupId })
      .fire();
  }

  /**
   * Marks the given chain id and group id not available for allocation
   *
   * @param chainId {Number} - chain id
   * @param groupId {Number} - group id
   * @returns {Promise<*>}
   */
  async stopAllocation(chainId, groupId) {
    const oThis = this;

    await oThis._validateChainAndGroupIds(chainId, groupId);

    return oThis
      .update({
        is_available_for_allocation:
          invertedIsAvailableForAllocationEnum[configGroupConstants.notAvailableForAllocation]
      })
      .where({ chain_id: chainId, group_id: groupId })
      .fire();
  }

  /**
   * This function is just to validate chainId and group Id.
   * @param chainId
   * @param groupId
   * @returns {Promise<*>}
   * @private
   */
  async _validateChainAndGroupIds(chainId, groupId) {
    if (typeof chainId != 'number' || typeof groupId != 'number') {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_m_m_cg_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }
    return Promise.resolve(responseHelper.successWithData({}));
  }
}

module.exports = ConfigGroups;
