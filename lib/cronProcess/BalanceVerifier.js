/**
 * Class for inserting Balance Verifier entry in cron processes table.
 *
 * @module lib/cronProcess/BalanceVerifier
 */

const rootPrefix = '../..',
  CronProcessBase = require(rootPrefix + '/lib/cronProcess/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

/**
 * Class for inserting Balance Verifier entry in cron processes table.
 *
 * @class
 */
class BalanceVerifier extends CronProcessBase {
  /**
   * Constructor
   *
   * @param {object} params
   * @param {number} params.auxChainId
   * @param {number} params.timeStamp
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.timeStamp = params.timeStamp;
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

    // Parameter validations.
    if (!CommonValidators.validateNonZeroInteger(oThis.auxChainId)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_cp_bv_1',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    if (!CommonValidators.validateNonZeroInteger(oThis.timeStamp)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_cp_bv_2',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    oThis.auxChainId = Number(oThis.auxChainId);
    oThis.timeStamp = Number(oThis.timeStamp);
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
        auxChainId: oThis.auxChainId,
        timeStamp: oThis.timeStamp
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
    oThis.cronKind = cronProcessesConstants.balanceVerifier;
  }
}

module.exports = BalanceVerifier;
