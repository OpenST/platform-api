/**
 * Class for inserting cron which updates real-time gas price in cron processes table.
 *
 * @module lib/cronProcess/UpdateRealtimeGasPrice
 */

const rootPrefix = '../..',
  CronProcessBase = require(rootPrefix + '/lib/cronProcess/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

/**
 * Class for inserting cron which updates real-time gas price in cron processes table.
 *
 * @class
 */
class UpdateRealtimeGasPrice extends CronProcessBase {
  /**
   * Constructor for inserting cron which updates real-time gas price in cron processes table.
   *
   * @param {Object} params
   * @param {Number/String} params.chainId
   * @param {Number/String} [params.id]
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.chainId = params.chainId;
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

    if (!CommonValidators.validateNonZeroInteger(oThis.chainId)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_cp_urgp_1',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    oThis.chainId = Number(oThis.chainId);

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
    const oThis = this,
      cronParams = {
        chainId: oThis.chainId
      };

    // Create entry in cron process table.
    const cronProcessResponse = await oThis.insert(cronParams);

    return cronProcessResponse.insertId;
  }

  /**
   * Get cron kind.
   */
  get getCronKind() {
    const oThis = this;

    oThis.cronKind = cronProcessesConstants.updateRealtimeGasPrice;
  }
}

module.exports = UpdateRealtimeGasPrice;
