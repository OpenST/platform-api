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
   * Check if the given chain id and group id is available for allocation
   *
   * @param chainId {Number} - chain id
   * @param groupId {Number} - group id
   * @returns {Promise<void>}
   */
  async isAvailableForAllocation(chainId, groupId) {
    const oThis = this;

    let configRecord = await oThis.fetchRecord(chainId, groupId);

    let returnData = {
      id: configRecord.id,
      chainId: chainId,
      groupId: groupId,
      is_available_for_allocation: isAvailableForAllocation[configRecord[0].is_available_for_allocation.toString()]
    };

    return responseHelper.successWithData(returnData);
  }

  /**
   * Mark as available for allocation
   *
   * @param chainId - chain id of the config group
   * @param groupId - group id of the config group
   */
  static async markAsAvailableForAllocation(chainId, groupId) {
    await new ConfigGroups().fetchRecord(chainId, groupId);

    return new ConfigGroups()
      .update({
        is_available_for_allocation: invertedIsAvailableForAllocation[configGroupConstants.availableForAllocation]
      })
      .where({ chain_id: chainId, group_id: groupId })
      .fire();
  }

  /**
   * Mark as un-available for allocation
   *
   * @param chainId - chain id of the config group
   * @param groupId - group id of the config group
   */
  static async markAsUnAvailableForAllocation(chainId, groupId) {
    await new ConfigGroups().fetchRecord(chainId, groupId);

    return new ConfigGroups()
      .update({
        is_available_for_allocation: invertedIsAvailableForAllocation[configGroupConstants.notAvailableForAllocation]
      })
      .where({ chain_id: chainId, group_id: groupId })
      .fire();
  }

  /**
   * Fetch record
   *
   * @param chainId
   * @param groupId
   *
   * @returns {Promise<*>}
   */
  async fetchRecord(chainId, groupId) {
    const oThis = this;

    await oThis._validateChainAndGroupIds(chainId, groupId);

    let configRecords = await oThis
      .select('*')
      .where(['chain_id = ? AND group_id = ?', chainId, groupId])
      .fire();

    if (configRecords.length === 0) {
      logger.error('No entry found for given chainId and group Id');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_m_m_cg_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return configRecords[0];
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
          internal_error_identifier: 'a_m_m_cg_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }
    return Promise.resolve(responseHelper.successWithData({}));
  }
}

module.exports = ConfigGroups;
