'use strict';

/**
 * Model to get client config strategy details.
 *
 * @module /app/models/mysql/ClientConfigStrategies
 */

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/core_constants'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base');

const dbName = 'saas_config_' + coreConstants.SUB_ENVIRONMENT + '_' + coreConstants.ENVIRONMENT;

class ClientConfigStrategiesModel extends ModelBase{

  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'client_config_strategies';

  }

  /**
   * Get details using the id.
   *
   * @param id
   * @returns {*}
   *
   */
  getById(id) {
    const oThis = this;

    return oThis
      .select(['client_id', 'config_strategy_id'])
      .where({ id: id })
      .fire();
  }

  /**
   * Get details for multiple ids.
   *
   * @param ids
   * @returns {*}
   *
   */
  getByIds(ids) {
    const oThis = this;

    return oThis
      .select(['client_id', 'config_strategy_id'])
      .where(['id IN (?)', ids])
      .fire();
  }

  /**
   * Get details using the clientId.
   *
   * @param clientId
   * @returns {*}
   *
   */
  getByClientId(clientId) {
    const oThis = this;

    return oThis
      .select(['client_id', 'config_strategy_id', 'auxilary_data'])
      .where({ client_id: clientId })
      .fire();
  }

  /**
   * Get details for multiple clientIds.
   *
   * @param clientIds
   * @returns {*}
   *
   */
  getByClientIds(clientIds) {
    const oThis = this;

    return oThis
      .select(['client_id', 'config_strategy_id', 'auxilary_data'])
      .where(['client_id IN (?)', clientIds])
      .fire();
  }

  /**
   * Get details using the configStrategyId.
   *
   * @param configStrategyId
   * @returns {*}
   *
   */
  getByConfigStrategyId(configStrategyId) {
    const oThis = this;

    return oThis
      .select(['client_id', 'config_strategy_id'])
      .where({ config_strategy_id: configStrategyId })
      .fire();
  }

  /**
   * Add a record in the table.
   *
   * @param data
   *        data.client_id: clientId to be added.
   *        data.config_strategy_id: configStrategyId to be added.
   * @returns {*}
   *
   */
  insertRecord(data) {
    const oThis = this;

    if (!data.client_id || !data.config_strategy_id) {
      throw 'Mandatory parameters are missing.';
    }

    if (typeof data.client_id !== 'number' || typeof data.config_strategy_id !== 'number') {
      throw 'Insertion parameters should be integers.';
    }

    return oThis.insert(data).fire();
  }

  /**
   * Updated a record using the clientId and configStrategyId.
   *
   * @param params
   *        params.client_id: clientId for which record is to be updated.
   *        params.old_config_strategy_id: previous configStrategyId to be updated.
   *        params.new_config_strategy_id: new configStrategyId value.
   * @returns {*}
   *
   */
  updateByClientId(params) {
    const oThis = this;

    if (!params.client_id || !params.old_config_strategy_id || !params.new_config_strategy_id) {
      throw 'Mandatory parameters are missing. Expected an object with the following keys: {client_id, old_config_strategy_id, new_config_strategy_id}';
    }

    if (typeof params.new_config_strategy_id !== 'number') {
      throw 'new_config_strategy_id should be an integer.';
    }

    return oThis
      .update({ config_strategy_id: params.new_config_strategy_id })
      .where({
        client_id: params.client_id,
        config_strategy_id: params.old_config_strategy_id
      })
      .fire();
  }

  /**
   * Updated a record using configStrategyId.
   *
   * @param params
   *        params.old_config_strategy_id: previous configStrategyId to be updated.
   *        params.new_config_strategy_id: new configStrategyId value.
   * @returns {*}
   *
   */
  async updateByConfigStrategyId(params) {
    const oThis = this;

    if (!params.old_config_strategy_id || !params.new_config_strategy_id) {
      throw 'Mandatory parameters are missing. Expected an object with the following keys: {old_config_strategy_id, new_config_strategy_id}';
    }

    if (typeof params.new_config_strategy_id !== 'number') {
      throw 'new_config_strategy_id should be an integer.';
    }

    let clientAndConfigStrategyIdMapping = await new ClientConfigStrategiesModel().getByConfigStrategyId(
      params.old_config_strategy_id
    );
    let clientIds = [];
    for (let i = 0; i < clientAndConfigStrategyIdMapping.length; i++) {
      clientIds.push(clientAndConfigStrategyIdMapping[i].client_id);
    }

    await oThis
      .update({ config_strategy_id: params.new_config_strategy_id })
      .where({
        config_strategy_id: params.old_config_strategy_id
      })
      .fire();

    return Promise.resolve({ updatedClientIds: clientIds });
  }

  /**
   * Deletes a record using the clientId and configStrategyId.
   *
   * @param params
   *        params.client_id: clientId for which record is to be deleted.
   *        params.config_strategy_id: configStrategyId for which record is to be deleted.
   * @returns {*}
   *
   */
  deleteByClientId(params) {
    const oThis = this;

    if (!params.client_id || !params.config_strategy_id) {
      throw 'Mandatory parameters are missing. Expected an object with the following keys: {client_id, config_strategy_id}';
    }

    return oThis
      .delete()
      .where({
        client_id: params.client_id,
        config_strategy_id: params.config_strategy_id
      })
      .fire();
  }

  /**
   * Deletes a record using the configStrategyId.
   *
   * @param configStrategyId: configStrategyId for which records are to be deleted.
   * @returns {*}
   *
   */
  async deleteByConfigStrategyId(configStrategyId) {
    const oThis = this;

    if (!configStrategyId) {
      throw 'config_strategy_id is missing.';
    }

    if (typeof configStrategyId !== 'number') {
      throw 'config_strategy_id should be an integer.';
    }

    let clientAndConfigStrategyIdMapping = await new ClientConfigStrategiesModel().getByConfigStrategyId(
      configStrategyId
    );
    let clientIds = [];
    for (let i = 0; i < clientAndConfigStrategyIdMapping.length; i++) {
      clientIds.push(clientAndConfigStrategyIdMapping[i].client_id);
    }

    await oThis
      .delete()
      .where({ config_strategy_id: configStrategyId })
      .fire();

    return Promise.resolve({ deletedClientIds: clientIds });
  }

}

module.exports = ClientConfigStrategiesModel;
