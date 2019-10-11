'use strict';
/**
 * Model to get cron process and its details.
 *
 * @module /app/models/mysql/cronProcesses
 */
const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ModelBaseKlass = require(rootPrefix + '/app/models/mysql/Base'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

const dbName = 'saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment,
  kinds = {
    '1': cronProcessesConstants.blockParser,
    '2': cronProcessesConstants.transactionParser,
    '3': cronProcessesConstants.blockFinalizer,
    '4': cronProcessesConstants.economyAggregator,
    '5': cronProcessesConstants.workflowWorker,
    '6': cronProcessesConstants.updateRealtimeGasPrice,
    '7': cronProcessesConstants.fundByMasterInternalFunderOriginChainSpecific,
    '8': cronProcessesConstants.fundByMasterInternalFunderAuxChainSpecificChainAddresses,
    '9': cronProcessesConstants.fundBySealerAuxChainSpecific,
    '10': cronProcessesConstants.fundByTokenAuxFunderAuxChainSpecific,
    '11': cronProcessesConstants.updatePriceOraclePricePoints,
    '12': cronProcessesConstants.cronProcessesMonitor,
    '13': cronProcessesConstants.fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses,
    '14': cronProcessesConstants.fundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses,
    '15': cronProcessesConstants.executeTransaction,
    '16': cronProcessesConstants.auxWorkflowWorker,
    '17': cronProcessesConstants.fundByTokenAuxFunderToExTxWorkers,
    '18': cronProcessesConstants.balanceSettler,
    '19': cronProcessesConstants.executeRecovery,
    '20': cronProcessesConstants.originToAuxStateRootSync,
    '21': cronProcessesConstants.auxToOriginStateRootSync,
    '22': cronProcessesConstants.transactionErrorHandler,
    '24': cronProcessesConstants.balanceVerifier,
    '25': cronProcessesConstants.generateGraph,
    '26': cronProcessesConstants.recoveryRequestsMonitor,
    '27': cronProcessesConstants.webhookPreprocessor,
    '28': cronProcessesConstants.webhookProcessor,
    '29': cronProcessesConstants.webhookErrorHandler,
    '30': cronProcessesConstants.trackLatestTransaction
  },
  statuses = {
    '1': cronProcessesConstants.runningStatus,
    '2': cronProcessesConstants.stoppedStatus,
    '3': cronProcessesConstants.inactiveStatus
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
   * @returns {rows of db }
   */
  async getById(id) {
    const oThis = this;
    let response= await oThis
      .select(['id', 'kind','kind_name','ip_address', 'params', 'status', 'last_started_at', 'last_ended_at'])
      .where({ id: id })
      .fire();
    return response;
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
      .update({
        last_started_at: params.newLastStartTime,
        status: params.newStatus,
        ip_address: coreConstants.IP_ADDRESS
      })
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
