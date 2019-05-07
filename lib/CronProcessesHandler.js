/**
 * Cron process handler base class.
 *
 * @module lib/CronProcessesHandler
 */
const rootPrefix = '..',
  ErrorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  CronProcessesModel = require(rootPrefix + '/app/models/mysql/CronProcesses'),
  CronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry');

/**
 * Class for cron process handler.
 *
 * @class CronProcessHandler
 */
class CronProcessHandler {
  /**
   * This function returns the time in the proper format as needed to store in the tables.
   *
   * @param {String} timeInEpoch
   *
   * @returns {String}
   *
   * @private
   */
  _convertFromEpochToLocalTime(timeInEpoch) {
    const date = new Date(parseFloat(timeInEpoch));

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
      return Promise.reject('cron process id is not a number');
    }
    if (typeof cronKind !== 'string') {
      return Promise.reject('cron process kind is not a string.');
    }

    const invertedKind = new CronProcessesModel().invertedKinds[cronKind],
      runningStatus = CronProcessesConstants.runningStatus,
      lastStartTime = oThis._convertFromEpochToLocalTime(Date.now()),
      cronProcessRows = await new CronProcessesModel()
        .select('*')
        .where({ id: id, kind: invertedKind })
        .fire();

    // Validate whether process with cronKind and id exists.
    if (cronProcessRows.length === 0) {
      return Promise.reject('Entry does not exist in cron_processes_table.');
    }

    const stoppedStatusInt = new CronProcessesModel().invertedStatuses[CronProcessesConstants.stoppedStatus];

    // If status != stopped throw error as process cannot be started.
    if (cronProcessRows[0].status != stoppedStatusInt) {
      logger.error(
        'Can not start the cron as the status of the cron is: ',
        new CronProcessesModel().statuses[cronProcessRows[0].status]
      );
      const errorObject = responseHelper.error({
        internal_error_identifier: cronKind + ':cron_stuck:l_cph_1',
        api_error_identifier: 'cron_stuck',
        debug_options: {
          cronProcessId: id,
          cronKind: cronKind,
          cronStatus: new CronProcessesModel().statuses[cronProcessRows[0].status]
        }
      });

      await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);

      // Sleep to limit calls to PagerDuty.
      await basicHelper.sleep(30000);

      return Promise.reject('Cron process is not in stopped status.');
    }
    // Validations done.

    // Define cron_process updateParams.
    const updateParams = {
        id: id,
        kind: cronKind,
        newLastStartTime: lastStartTime,
        newStatus: runningStatus
      },
      cronProcessesResponse = await new CronProcessesModel().updateLastStartTimeAndStatus(updateParams);
    // Update entry in cronProcesses table

    if (cronProcessesResponse.affectedRows === 1) {
      return responseHelper.successWithData(cronProcessRows[0]);
    }

    return Promise.reject('cron process update query to mark it started failed to update.');
  }

  /**
   * Stops process and updates relevant fields in cron_processes.
   *
   * @param {Number} id
   *
   * @returns {Promise<void>}
   */
  async stopProcess(id) {
    const oThis = this;
    const cronProcessResp = await new CronProcessesModel()
      .select('*')
      .where({ id: id })
      .fire();
    const cronProcess = cronProcessResp[0],
      cronProcessStatus = new CronProcessesModel().statuses[cronProcess.status];
    const params = {
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
