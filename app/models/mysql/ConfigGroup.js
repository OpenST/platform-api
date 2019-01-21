'use strict';
/**
 * Model to get config groups.
 *
 * @module /app/models/mysql/ConfigGroup
 */
const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  configGroupConstants = require(rootPrefix + '/lib/globalConstant/configGroups');

const dbName = 'saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment,
  isAvailableForAllocation = {
    '0': configGroupConstants.notAvailableForAllocation,
    '1': configGroupConstants.availableForAllocation
  },
  invertedIsAvailableForAllocation = util.invert(isAvailableForAllocation);

/**
 * Class for config groups model
 *
 * @class
 */
class ConfigGroups extends ModelBase {
  /**
   * Constructor for config groups model
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'config_groups';
  }

  get isAvailableForAllocation() {
    return isAvailableForAllocation;
  }

  get invertedIsAvailableForAllocation() {
    return invertedIsAvailableForAllocation;
  }

  /**
   * Inserts record
   * @param {Object} params
   * @param {Number} params.chainId: chain id
   * @param {Number} params.groupId: group id
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
   * Get record by chain id and group id
   * @param {Number} chainId: chain id
   * @param {Number} groupId: group id
   * @returns {Promise<*>}
   */
  async getByChainIdAndGroupId(chainId, groupId) {
    const oThis = this;

    // Perform validations.
    if (!chainId || !groupId) {
      throw 'Mandatory parameters are missing. Either chainId or groupId';
    }

    return oThis
      .select('*')
      .where(['chain_id = ? AND group_id = ?', chainId, groupId])
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
      is_available_for_allocation: isAvailableForAllocation[configRecord[0].is_available_for_allocation.toString()]
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
        is_available_for_allocation: invertedIsAvailableForAllocation[configGroupConstants.availableForAllocation]
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
        is_available_for_allocation: invertedIsAvailableForAllocation[configGroupConstants.notAvailableForAllocation]
      })
      .where({ chain_id: chainId, group_id: groupId })
      .fire();
  }

  /**
   * This function is just to validate chainId and group Id.
   *
   * @param chainId
   * @param groupId
   *
   * @returns {Promise<*>}
   *
   * @private
   */
  async _validateChainAndGroupIds(chainId, groupId) {
    if (typeof chainId !== 'number' || typeof groupId !== 'number') {
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
