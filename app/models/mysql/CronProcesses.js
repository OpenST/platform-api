/**
 * Model to get cron process and its details.
 *
 * @module /app/models/mysql/cronProcesses
 */
const rootPrefix = '../../..',
  ModelBaseKlass = require(rootPrefix + '/app/models/mysql/Base'),
  util = require(rootPrefix + '/lib/util'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

// Declare constants.
const has = Object.prototype.hasOwnProperty; // Cache the lookup once, in module scope.

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
    '30': cronProcessesConstants.trackLatestTransaction,
    '31': cronProcessesConstants.usdToFiatCurrencyConversion,
    '32': cronProcessesConstants.companyLowBalanceAlertEmail
  },
  statuses = {
    '1': cronProcessesConstants.runningStatus,
    '2': cronProcessesConstants.stoppedStatus,
    '3': cronProcessesConstants.inactiveStatus
  },
  invertedKinds = util.invert(kinds),
  invertedStatuses = util.invert(statuses);

/**
 * Class for cron process model.
 *
 * @class CronProcessesModel
 */
class CronProcessesModel extends ModelBaseKlass {
  /**
   * Constructor for cron process model.
   *
   * @augments ModelBaseKlass
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
   * @param {number} id
   *
   * @returns {{} }
   */
  async getById(id) {
    const oThis = this;

    return oThis
      .select(['id', 'kind', 'kind_name', 'ip_address', 'params', 'status', 'last_started_at', 'last_ended_at'])
      .where({ id: id })
      .fire();
  }

  /**
   * This method inserts an entry in the table.
   *
   * @param {object} params
   * @param {string} params.kind
   * @param {string} params.ip_address
   * @param {number} params.chain_id
   * @param {string} params.params
   * @param {string} params.status
   * @param {number} params.lastStartTime
   * @param {number} params.lastEndTime
   *
   * @returns {*}
   */
  insertRecord(params) {
    const oThis = this;

    // Perform validations.
    if (
      !has.call(params, 'kind') ||
      !has.call(params, 'ip_address') ||
      !has.call(params, 'status') ||
      !has.call(params, 'chain_id')
    ) {
      throw new Error('Mandatory parameters are missing.');
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
   * @param {object} params
   * @param {number} params.id
   * @param {string} params.kind
   * @param {string} params.newLastStartTime
   * @param {string} params.newStatus
   * @returns {Promise<*>}
   */
  async updateLastStartTimeAndStatus(params) {
    const oThis = this;

    // Perform validations.
    if (
      !has.call(params, 'id') ||
      !has.call(params, 'newLastStartTime') ||
      !has.call(params, 'newStatus') ||
      !has.call(params, 'kind')
    ) {
      throw new Error(
        'Mandatory parameters are missing. Expected an object with the following keys: {id, kind, newLastStartTime, newStatus}'
      );
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
   * @param {object} params
   * @param {number} params.id
   * @param {number} params.newLastEndTime
   * @param {string} params.newStatus
   * @returns {Promise<*>}
   */
  async updateLastEndTimeAndStatus(params) {
    const oThis = this;

    // Perform validations.
    if (!params.id || !params.newLastEndTime || !params.newStatus) {
      throw new Error(
        'Mandatory parameters are missing. Expected an object with the following keys: {id, newLastEndTime, newStatus}'
      );
    }
    params.newStatus = oThis.invertedStatuses[params.newStatus];

    await oThis
      .update({ last_ended_at: params.newLastEndTime, status: params.newStatus })
      .where({ id: params.id })
      .fire();
  }
}

module.exports = CronProcessesModel;
