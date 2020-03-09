/**
 * Class for inserting company low balance alert email entry in cron processes table.
 *
 * @module lib/cronProcess/CompanyLowBalanceAlertEmail
 */

const rootPrefix = '../..',
  CronProcessBase = require(rootPrefix + '/lib/cronProcess/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

/**
 * Class for inserting company low balance alert email entry in cron processes table.
 *
 * @class CompanyLowBalanceAlertEmail
 */
class CompanyLowBalanceAlertEmail extends CronProcessBase {
  /**
   * Constructor for inserting company low balance alert email entry in cron processes table.
   *
   * @param {object} params
   * @param {number/string} params.auxChainId
   * @param {number/string} params.groupId
   * @param {number/string} [params.id]
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.groupId = params.groupId;
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
          internal_error_identifier: 'l_cp_lbae_1',
          api_error_identifier: '',
          debug_options: { auxChainId: oThis.auxChainId }
        })
      );
    }

    if (!CommonValidators.validateNonZeroInteger(oThis.groupId)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_cp_lbae_2',
          api_error_identifier: '',
          debug_options: { groupId: oThis.groupId }
        })
      );
    }

    oThis.auxChainId = Number(oThis.auxChainId);
    oThis.groupId = Number(oThis.groupId);

    await oThis.checkForExistingCronPerChain(cronProcessesConstants.auxChainIdKey, oThis.chainId);
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

    const cronParams = {
      auxChainId: oThis.auxChainId,
      groupId: oThis.groupId
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

    oThis.cronKind = cronProcessesConstants.companyLowBalanceAlertEmail;
  }
}

module.exports = CompanyLowBalanceAlertEmail;
