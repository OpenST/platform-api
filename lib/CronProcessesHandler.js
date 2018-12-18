'use strict';
/**
 * Cron process handler base class.
 *
 * @module /lib/cronProcessesHandler
 */
const rootPrefix = '..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  CronProcessesModel = require(rootPrefix + '/app/models/mysql/CronProcesses'),
  CronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

/**
 * Class for cron process handler
 *
 * @class
 */
class CronProcessHandler {
  /**
   * Constructor for cron process handler
   *
   * @constructor
   */
  constructor() {}
  /**
   * This function returns the time in the proper format as needed to store in the tables.
   *
   * @param timeInEpoch
   * @returns {String}
   * @private
   */
  _convertFromEpochToLocalTime(timeInEpoch) {
    let date = new Date(parseFloat(timeInEpoch));
    return (
      date.getFullYear() +
      '-' +
      (date.getMonth() + 1) +
      '-' +
      date.getDate() +
      ' ' +
      date.getHours() +
      ':' +
      date.getMinutes() +
      ':' +
      date.getSeconds()
    );
  }

  /**
   * This function validates whether the cron can be started or not.
   *
   * @param {Object} params
   * @param {Number} params.id
   * @param {String} params.cronKind
   *
   * @returns {Promise<*>}
   */
  async canStartProcess(params) {
    const oThis = this,
      id = params.id,
      cronKind = params.cronKind;

    // Type validations.
    if (typeof id !== 'number') {
      throw 'id is not a number';
    }
    if (typeof cronKind !== 'string') {
      throw 'cronKind is not a string.';
    }

    let invertedKind = CronProcessesConstants.invertedKinds[cronKind],
      runningStatus = CronProcessesConstants.runningStatus,
      lastStartTime = oThis._convertFromEpochToLocalTime(Date.now()),
      validationResponse = await new CronProcessesModel()
        .select('*')
        .where({ id: id, kind: invertedKind })
        .fire();

    if (validationResponse.length === 0) {
      logger.error('Entry does not exist in cron_processes_table.');
      process.exit(1);
    }
    // Checks whether process with same cronKind and id already exists.

    // If status != stopped throw error as process cannot be started.
    if (
      validationResponse[0].status !== +CronProcessesConstants.invertedStatuses[CronProcessesConstants.stoppedStatus]
      // Implicit string to int conversion.
    ) {
      logger.error(
        'Can not start the cron as the status of the cron is: ',
        CronProcessesConstants.statuses[validationResponse[0].status]
      );
      process.exit(1);
    }
    // Validations done.

    // Define cron_process updateParams.
    let updateParams = {
        id: id,
        kind: cronKind,
        newLastStartTime: lastStartTime,
        newStatus: runningStatus
      },
      cronProcessesResponse = await new CronProcessesModel().updateLastStartTimeAndStatus(updateParams);
    // Update entry in cronProcesses table

    if (cronProcessesResponse.affectedRows === 1) {
      return Promise.resolve(responseHelper.successWithData(validationResponse[0]));
    } else {
      return Promise.reject({});
    }
  }

  /**
   * Stops process and updates relevant fields in cron_processes.
   *
   * @param {Number} id
   * @returns {Promise<void>}
   */
  async stopProcess(id) {
    const oThis = this,
      params = {
        id: id,
        newLastEndTime: oThis._convertFromEpochToLocalTime(Date.now()),
        newStatus: CronProcessesConstants.stoppedStatus
      };

    await new CronProcessesModel().updateLastEndTimeAndStatus(params);
  }

  /**
   * Ends after certain time as passed in params.
   *
   * @param {Object} params
   * @param {Number} params.timeInMinutes
   */
  endAfterTime(params) {
    const timeInMinutes = params.timeInMinutes * 60;

    setInterval(function() {
      logger.info('ending the process');
      process.emit('SIGINT');
    }, timeInMinutes * 1000);
  }
}

module.exports = CronProcessHandler;
