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
  constructor(params) {
    const oThis = this;


    oThis.ids = params.ids;
    oThis.status = params.status;
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
   * @return {Promise<result>}
   */
  async _asyncPerform() {
    const oThis = this;
    let CronProcessModelObj=new CronProcessModel();
    let rowData=await CronProcessModelObj.getById(oThis.ids);
    if(rowData.length < 1){
      return Promise.reject(responseHelper.error({
        internal_error_identifier: 'do_u_cs_uc_ap1',
        api_error_identifier:  "unable to get rows by ids ",
        debug_options: {}
      }));
    }
    let idsToBeUpdated=[];
    for(let i=0;i<rowData.length;i++){
      if(rowData[i]['status']!=oThis.status){
        idsToBeUpdated.push(rowData[i][id])
      }
    }
    for(let i=0;i<idsToBeUpdated.length;i++){
      let updateCronProcessModelObj=new CronProcessModel();
      let updateResponse=await updateCronProcessModelObj.updateLastEndTimeAndStatus({
        newLastEndTime:  oThis._convertFromEpochToLocalTime(Date.now()),
        id:idsToBeUpdated[i],
        newStatus:oThis.status
      });
      if(!updateResponse){
        return Promise.reject(responseHelper.error({
          internal_error_identifier: 'do_u_cs_uc_ap2',
          api_error_identifier:  "unable to update rows ",
          debug_options: {}
        }));
      }
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

module.exports = UpdateCron;
