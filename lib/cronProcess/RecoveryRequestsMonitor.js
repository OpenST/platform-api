/**
 * Module for inserting cron which monitors recovery requests in cron processes table.
 *
 * @module lib/cronProcess/RecoveryRequestsMonitor
 */

const rootPrefix = '../..',
  CronProcessBase = require(rootPrefix + '/lib/cronProcess/Base'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

/**
 * Class for inserting cron which monitors recovery requests in cron processes table.
 *
 * @class RecoveryRequestsMonitor
 */
class RecoveryRequestsMonitor extends CronProcessBase {
  /**
   * Constructor for inserting cron which monitors recovery requests in cron processes table.
   *
   * @param {object} params
   * @param {number/string} [params.id]
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
   * @private
   */
  async validateAndSanitize() {
    const oThis = this;

    // Call validate method of base class.
    await oThis.validateCronKind();

    await oThis.checkForExistingCronPerSubEnv();
  }

  /**
   * Set cron in cron processes table.
   *
   * @return {Promise<void>}
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

    oThis.cronKind = cronProcessesConstants.recoveryRequestsMonitor;
  }
}

module.exports = RecoveryRequestsMonitor;
