const fs = require('fs');

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CronProcessModel = require(rootPrefix + '/app/models/mysql/CronProcesses');
/**
 * Class for inserting cron entries into saas db
 *
 * @class
 */
class UpdateCron {
  /**
   * Constructor
   *
   * @constructor
   */
  constructor() {
    const oThis = this;
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
      logger.error('devops/utils/UpdateCron.js::perform::catch', error);
      return oThis._getRespError('do_u_cs_uc_p1');
    });
  }

  /**
   * Async perform
   * options.ids : array of identifiers to be updated
   * options.status : status to be set in DB
   * @return {Promise<result>}
   */
  async _asyncPerform(options) {
    const oThis = this;
    let CronProcessModelObj=new CronProcessModel();
    let rowData=await CronProcessModelObj.getById(options.ids);
    if(rowData.length < 1){
      throw "unable to get rows by ids do_u_cs_uc_ap1"
    }
    let idsToBeUpdated=[];
    for(let i=0;i<rowData.length;i++){
      if(rowData[i][status]!=options.status){
        idsToBeUpdated.push(rowData[i][id])
      }
    }
    for(let i=0;i<idsToBeUpdated.length;i++){
      let updateCronProcessModelObj=new CronProcessModel();
      let updateResponse=await updateCronProcessModelObj.updateLastEndTimeAndStatus({
        newLastEndTime:  oThis._convertFromEpochToLocalTime(Date.now()),
        id:idsToBeUpdated[i],
        newStatus:options.status
      });
      if(!updateResponse){
        throw "unable to update for id idsToBeUpdated[i] do_u_cs_uc_ap2"
      }
    }
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

module.exports = UpdateCron;
