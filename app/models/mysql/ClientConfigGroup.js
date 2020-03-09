/**
 * Model to get client config strategy details.
 *
 * @module /app/models/mysql/ClientConfigGroup
 */
const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

// Declare variables.
const dbName = 'saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;
const has = Object.prototype.hasOwnProperty; // Cache the lookup once, in module scope.

/**
 * Class for client config groups model.
 *
 * @class ClientConfigGroups
 */
class ClientConfigGroups extends ModelBase {
  /**
   * Constructor for client config groups model.
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'client_config_groups';
  }

  /**
   * Inserts record
   *
   * @param {object} params
   * @param {number} params.clientId: client id
   * @param {number} params.chainId: chain id
   * @param {number} params.groupId: group id
   *
   * @returns {Promise<*>}
   */
  async insertRecord(params) {
    const oThis = this;

    // Perform validations.
    if (!has.call(params, 'clientId') || !has.call(params, 'chainId') || !has.call(params, 'groupId')) {
      throw new Error(
        'Mandatory parameters are missing. Expected an object with the following keys: {clientId, chainId, groupId}'
      );
    }

    await oThis._validateChainAndGroupIds(params.chainId, params.groupId);

    return oThis
      .insert({
        client_id: params.clientId,
        chain_id: params.chainId,
        group_id: params.groupId
      })
      .fire();
  }

  /**
   * This function is just to validate chainId and group Id.
   *
   * @param {number} chainId
   * @param {number} groupId
   *
   * @returns {Promise<*>}
   *
   * @private
   */
  async _validateChainAndGroupIds(chainId, groupId) {
    if (typeof chainId !== 'number' || typeof groupId !== 'number') {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_m_m_ccg_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return responseHelper.successWithData({});
  }
}

module.exports = ClientConfigGroups;
