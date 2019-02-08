'use strict';
/**
 * Model to get cron process and its details.
 *
 * @module /app/models/mysql/cronProcesses
 */
const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ModelBaseKlass = require(rootPrefix + '/app/models/mysql/Base'),
  cronProcessesConstant = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  util = require(rootPrefix + '/lib/util');

const dbName = 'saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment,
  kinds = {
    '1': cronProcessesConstant.blockParser,
    '2': cronProcessesConstant.transactionParser,
    '3': cronProcessesConstant.blockFinalizer,
    '4': cronProcessesConstant.economyAggregator,
    '5': cronProcessesConstant.workflowWorker,
    '6': cronProcessesConstant.updateRealtimeGasPrice,
    '7': cronProcessesConstant.fundEth,
    '8': cronProcessesConstant.fundStPrime,
    '9': cronProcessesConstant.fundByMasterInternalFunderOriginChainSpecific,
    '10': cronProcessesConstant.fundByChainOwnerAuxChainSpecificChainAddresses,
    '11': cronProcessesConstant.fundBySealerAuxChainSpecific,
    '12': cronProcessesConstant.fundByTokenAuxFunderAuxChainSpecific,
    '13': cronProcessesConstant.updatePriceOraclePricePoints,
    '14': cronProcessesConstant.emailNotifier,
    '15': cronProcessesConstant.fundByChainOwnerAuxChainSpecificTokenFunderAddresses,
    '16': cronProcessesConstant.fundByChainOwnerAuxChainSpecificInterChainFacilitatorAddresses,
    '17': cronProcessesConstant.executeTransaction
  },
  statuses = {
    '1': cronProcessesConstant.runningStatus,
    '2': cronProcessesConstant.stoppedStatus,
    '3': cronProcessesConstant.inactiveStatus
  },
  invertedKinds = util.invert(kinds),
  invertedStatuses = util.invert(statuses);

/**
 * Class for cron process model
 *
 * @class
 */
class CronProcessesModel extends ModelBaseKlass {
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

  get kinds() {
    return kinds;
  }

  get statuses() {
    return statuses;
  }

  get invertedKinds() {
    return invertedKinds;
  }

  get invertedStatuses() {
    return invertedStatuses;
  }

  /**
   * This method gets the response for the id passed.
   *
   * @param {Number} id
   *
   * @returns {Promise<>}
   */
  get(id) {
    const oThis = this;

    let response = oThis
      .select(['kind', 'ip_address', 'group_id', 'params', 'status', 'last_started_at', 'last_ended_at'])
      .where({ id: id })
      .fire();

    return Promise.resolve(response);
  }

  /**
   * This method inserts an entry in the table.
   *
   * @param {Object} params
   * @param {String} params.kind
   * @param {String} params.ip_address
   * @param {Number} params.chain_id
   * @param {String} params.params
   * @param {String} params.status
   * @param {Number} params.lastStartTime
   * @param {Number} params.lastEndTime
   *
   * @returns {*}
   */
  insertRecord(params) {
    const oThis = this;

    // Perform validations.
    if (
      !params.hasOwnProperty('kind') ||
      !params.hasOwnProperty('ip_address') ||
      !params.hasOwnProperty('status') ||
      !params.hasOwnProperty('chain_id')
    ) {
      throw 'Mandatory parameters are missing.';
    }

    if (typeof params.kind !== 'string' || typeof params.ip_address !== 'string' || typeof params.status !== 'string') {
      throw TypeError('Insertion parameters are of wrong params types.');
    }
    params.status = oThis.invertedStatuses[params.status];
    params.kind = oThis.invertedKinds[params.kind];

    return oThis.insert(params).fire();
  }

  /**
   * This method updates the last start time and status of an entry.
   *
   * @param {Object} params
   * @param {Number} params.id
   * @param {String} params.kind
   * @param {String} params.newLastStartTime
   * @param {String} params.newStatus
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

    params.newStatus = oThis.invertedStatuses[params.newStatus];
    params.kind = oThis.invertedKinds[params.kind];

    return oThis
      .update({ last_started_at: params.newLastStartTime, status: params.newStatus })
      .where({ id: params.id })
      .fire();
  }

  /**
   * This method updates the last end time and status of an entry.
   *
   * @param {Object} params
   * @param {Number} params.id
   * @param {Number} params.newLastEndTime
   * @param {String} params.newStatus
   * @returns {Promise<*>}
   */
  async updateLastEndTimeAndStatus(params) {
    const oThis = this;

    // Perform validations.
    if (!params.id || !params.newLastEndTime || !params.newStatus) {
      throw 'Mandatory parameters are missing. Expected an object with the following keys: {id, newLastEndTime, newStatus}';
    }
    params.newStatus = oThis.invertedStatuses[params.newStatus];

    await oThis
      .update({ last_ended_at: params.newLastEndTime, status: params.newStatus })
      .where({ id: params.id })
      .fire();
  }
}

module.exports = CronProcessesModel;
