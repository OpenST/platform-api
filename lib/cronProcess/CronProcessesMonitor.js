/**
 * Class for inserting CronProcesses Monitor entry in cron processes table.
 *
 * @module lib/cronProcess/CronProcessesMonitor
 */

const rootPrefix = '../..',
  CronProcessBase = require(rootPrefix + '/lib/cronProcess/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

/**
 * Class for inserting CronProcesses Monitor entry in cron processes table.
 *
 * @class
 */
class CronProcessesMonitor extends CronProcessBase {
  /**
   * Constructor for inserting inserting CronProcesses Monitor  in cron processes table.
   *
   * @param {Object} params
   *
   * @constructor
   */
  constructor(params) {
    super(params);
  }

  /**
   * Main performer of the class.
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis.validateAndSanitize();

    return oThis.set();
  }

  /**
   * Validate cron params.
   *
   * @return {Promise<never>}
   *
   * @private
   */
  async validateAndSanitize() {
    const oThis = this;

    // Call validate method of base class.
    oThis.validateCronKind();

    await oThis.checkForExistingCronPerSubEnv();
  }

  /**
   * Set cron in cron processes table.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async set() {
    const oThis = this;

    // Create entry in cron process table.
    const cronProcessResponse = await oThis.insert();

    return cronProcessResponse.insertId;
  }

  /**
   * Get cron kind.
   */
  get getCronKind() {
    const oThis = this;

    oThis.cronKind = cronProcessesConstants.cronProcessesMonitor;
  }
}

module.exports = CronProcessesMonitor;
