'use strict';
/**
 * Cron process handler base class.
 *
 * @module lib/CronProcessesHandler
 */
const rootPrefix = '..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ErrorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
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

    let invertedKind = new CronProcessesModel().invertedKinds[cronKind],
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
      validationResponse[0].status != new CronProcessesModel().invertedStatuses[CronProcessesConstants.stoppedStatus]
      // Implicit string to int conversion.
    ) {
      logger.error(
        'Can not start the cron as the status of the cron is: ',
        new CronProcessesModel().statuses[validationResponse[0].status]
      );
      const errorObject = responseHelper.error({
        internal_error_identifier: cronKind + ':cron_stuck:l_cph_1',
        api_error_identifier: 'cron_stuck',
        debug_options: {
          cronProcessId: id,
          cronKind: cronKind,
          cronStatus: CronProcessesConstants.stoppedStatus
        }
      });

      await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);
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
      return responseHelper.successWithData(validationResponse[0]);
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
    const oThis = this;
    let cronProcessResp = await new CronProcessesModel()
      .select('*')
      .where({ id: id })
      .fire();
    let cronProcess = cronProcessResp[0],
      cronProcessStatus = new CronProcessesModel().statuses[cronProcess.status];
    let params = {
      id: id,
      newLastEndTime: oThis._convertFromEpochToLocalTime(Date.now()),
      newStatus: cronProcessStatus
    };

    if (cronProcessStatus != CronProcessesConstants.inactiveStatus) {
      params.newStatus = CronProcessesConstants.stoppedStatus;
    }
    await new CronProcessesModel().updateLastEndTimeAndStatus(params);
  }
}

module.exports = CronProcessHandler;
