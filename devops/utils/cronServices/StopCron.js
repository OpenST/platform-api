const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CronProcessModel = require(rootPrefix + '/app/models/mysql/CronProcesses'),
  CronProcessesHandler = require(rootPrefix + '/lib/CronProcessesHandler'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');
/**
 * Class for updating status in cron table
 *
 * @class
 */
class StopCron {
  /**
   * Constructor
   *
   * @constructor
   */
  constructor(ids) {
    const oThis = this;

    oThis.ids = ids;
    oThis.status = cronProcessesConstants.stoppedStatus;
  }

  /**
   *
   * Perform
   *
   * @return {Promise<result>}
   *
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch((error) => {
      if (responseHelper.isCustomResult(error)) {
        return error;
      }
      logger.error('devops/utils/StopCron.js::perform::catch', error);
      return oThis._getRespError('do_u_cs_uc_p1');
    });
  }

  /**
   * Async perform
   * @return {Promise<result>}
   */
  async _asyncPerform() {
    const oThis = this;
    let CronProcessModelObj = new CronProcessModel();
    let rowData = await CronProcessModelObj.getById(oThis.ids);
    if (rowData.length < 1) {
      return oThis._getRespError('do_u_cs_uc_ap1');
    }
    let idsToBeUpdated = [];
    for (let i = 0; i < rowData.length; i++) {
      if (rowData[i]['status'] != new CronProcessModel().invertedStatuses[oThis.status]) {
        idsToBeUpdated.push(rowData[i]['id']);
      }
    }
    let CronProcessesHandlerObj = new CronProcessesHandler();
    for (let i = 0; i < idsToBeUpdated.length; i++) {
      let updateCronProcessModelObj = new CronProcessModel();
      await updateCronProcessModelObj.updateLastEndTimeAndStatus({
        newLastEndTime: CronProcessesHandlerObj._convertFromEpochToLocalTime(Date.now()),
        id: idsToBeUpdated[i],
        newStatus: oThis.status
      });
    }
    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   * Generate Error response
   *
   * @param code {String} - Error internal identifier
   *
   * @returns {Promise<void>}
   * @private
   */
  async _getRespError(code) {
    return responseHelper.error({
      internal_error_identifier: code,
      api_error_identifier: 'something_went_wrong',
      debug_options: {}
    });
  }
}

module.exports = StopCron;
