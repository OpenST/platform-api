const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  fs = require('fs'),
  CronProcessModel = require('./app/models/mysql/CronProcesses');

/**
 * Class for inserting cron entries into saas db
 *
 * @class
 */
class insertCron {
  /**
   * Constructor
   *
   * @param
   *
   * @constructor
   */
  constructor(fileName) {
    const oThis = this;
    oThis.jsonData = require(fileName);
  }

  /**
   *
   * async insert
   *
   * @return {Promise<result>} unique identifier
   *
   */
  async insertDb(cron) {
    const oThis = this;
    let cronProcessObj = new CronProcessModel();
    let response = cronProcessObj.insertRecord(cron.db_params);
    return response;
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

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('devops/utils/InsertCron.js::perform::catch', error);
        return oThis._getRespError('do_u_cs_i_p1');
      }
    });
  }

  /**
   *
   * async perform
   *
   * @return {Promise<result>}
   *
   */
  async _asyncPerform() {
    const oThis = this;
    var output = {};
    for (let cron in oThis.jsonData) {
      output[cron['name']] = {};
      for (var i = 1; i <= cron['number_of_instances']; i++) {
        let result = await oThis.insertDb(cron);
        console.log(result);
        if (!output[cron['name']][cron['ip_address']]) {
          output[cron['name']][cron['ip_address']] = [];
        }
        output[cron['name']][cron['ip_address']].push(result.data['id']);
      }
    }
    let response = fs.writeFileSync(rootPrefix + '/cronOutput.json', JSON.stringify(output));
    return response;
  }
}
module.exports = insertCron;
