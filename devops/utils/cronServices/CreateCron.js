const fs = require('fs');

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  InsertCrons = require(rootPrefix + '/lib/cronProcess/InsertCrons'),
  AddCronProcessService = require(rootPrefix + '/lib/addCronProcess');

/**
 * Class for inserting cron entries into saas db
 *
 * @class
 */
class CreateCron {
  /**
   * Constructor
   *
   * @param {String} inputJsonFile: Input JSON file path
   * @param {String} outputJsonFile:  Output JSON file path
   *
   * @constructor
   */
  constructor(inputJsonFile, outputJsonFile) {
    const oThis = this;
    oThis.jsonData = require(inputJsonFile);
    oThis.outputFile = outputJsonFile;
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
      logger.error('devops/utils/InsertCron.js::perform::catch', error);
      return oThis._getRespError('do_u_cs_ic_p1');
    });
  }

  /**
   * Async perform
   *
   * @return {Promise<result>}
   */
  async _asyncPerform() {
    const oThis = this;

    for (let i = 0; i < oThis.jsonData.length; i += 1) {
      const cron = oThis.jsonData[i],
        dbParams = cron.db_params;

      if (!cron.identifier) {
        // Add cron process entry in DB
        const result = await new InsertCrons().perform(dbParams.kind, dbParams.cron_params);

        if (result > 0) {
          cron.identifier = result;
        }
      }
    }

    fs.writeFileSync(oThis.outputFile, JSON.stringify(oThis.jsonData));

    return responseHelper.successWithData({ outputJson: oThis.jsonData });
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

module.exports = CreateCron;
