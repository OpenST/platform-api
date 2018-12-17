'use strict';
/**
 * Model to get cron process and its details.
 *
 * @module /app/models/mysql/cronProcesses
 */
const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ModelBaseKlass = require(rootPrefix + '/app/models/mysql/Base'),
  cronProcessesConstant = require(rootPrefix + '/lib/globalConstant/cronProcesses');

const dbName = 'saas_config_' + coreConstants.SUB_ENVIRONMENT + '_' + coreConstants.ENVIRONMENT;

/**
 * Class for cron process model
 *
 * @class
 */
class CronProcessesModel extends ModelBaseKlass{
  /**
   * Constructor for cron process model
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });
    
    const oThis = this;
    
    oThis.tableName = 'cron_processes';
  }
  
  /**
   *
   * @param id
   * @returns {Promise<>}
   */
  get(id) {
    const oThis = this;

    let response = oThis
      .select(['kind', 'ip_address', 'group_id', 'params', 'status', 'last_start_time', 'last_end_time'])
      .where({ id: id })
      .fire();

    return Promise.resolve(response);
  }

  /**
   *
   * @param params
   *        params.kind {string}
   *        params.ipAddress {string}
   *        params.groupId {number}
   *        params.params {string}
   *        params.status {string}
   *        params.lastStartTime {number}
   *        params.lastEndTime {number}
   * @returns {*}
   */
  insertRecord(params) {
    const oThis = this;

    // Perform validations.
    if (
      !params.hasOwnProperty('kind') ||
      !params.hasOwnProperty('ipAddress') ||
      !params.hasOwnProperty('status') ||
      !params.hasOwnProperty('groupId')
    ) {
      throw 'Mandatory parameters are missing.';
    }

    if (typeof params.kind !== 'string' || typeof params.ipAddress !== 'string' || typeof params.status !== 'string') {
      throw TypeError('Insertion parameters are of wrong params types.');
    }
    params.status = cronProcessesConstant.invertedStatuses[params.status];
    params.kind = cronProcessesConstant.invertedKinds[params.kind];

    return oThis.insert(params).fire();
  }

  /**
   *
   * @param params
   * @param params.id {number}
   * @param params.kind {string}
   * @param params.newLastStartTime {string}
   * @param params.newStatus {string}
   * @returns {Promise<*>}
   */
  async updateLastStartTimeAndStatus(params) {
    const oThis = this;

    // Perform validations.
    if (
      !params.hasOwnProperty('id') ||
      !params.hasOwnProperty('newLastStartTime') ||
      !params.hasOwnProperty('newStatus') ||
      !params.hasOwnProperty('kind')
    ) {
      throw 'Mandatory parameters are missing. Expected an object with the following keys: {id, kind, newLastStartTime, newStatus}';
    }

    params.newStatus = cronProcessesConstant.invertedStatuses[params.newStatus];
    params.kind = cronProcessesConstant.invertedKinds[params.kind];

    return oThis
      .update({ last_start_time: params.newLastStartTime, status: params.newStatus })
      .where({ id: params.id })
      .fire();
  }

  /**
   *
   * @param params
   *        params.id {number}
   *        params.newLastEndTime {number}
   *        params.newStatus {string}
   * @returns {Promise<*>}
   */
  async updateLastEndTimeAndStatus(params) {
    const oThis = this;

    // Perform validations.
    if (!params.id || !params.newLastEndTime || !params.newStatus) {
      throw 'Mandatory parameters are missing. Expected an object with the following keys: {id, new_last_end_time, new_status}';
    }
    params.newStatus = cronProcessesConstant.invertedStatuses[params.newStatus];

    await oThis
      .update({ last_end_time: params.newLastEndTime, status: params.newStatus })
      .where({ id: params.id })
      .fire();
  }
}

module.exports = CronProcessesModel;
