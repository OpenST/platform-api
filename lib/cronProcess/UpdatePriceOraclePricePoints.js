/**
 * Module for inserting cron which updates price oracle price points in cron processes table.
 *
 * @module lib/cronProcess/UpdatePriceOraclePricePoints
 */

const rootPrefix = '../..',
  CronProcessBase = require(rootPrefix + '/lib/cronProcess/Base'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

/**
 * Class for inserting cron which updates price oracle price points in cron processes table.
 *
 * @class UpdatePriceOraclePricePoints
 */
class UpdatePriceOraclePricePoints extends CronProcessBase {
  /**
   * Constructor for inserting cron which updates price oracle price points in cron processes table.
   *
   * @param {object} params
   * @param {number/string} params.auxChainId
   * @param {string} params.baseCurrency
   * @param {number/string} [params.id]
   *
   * @augments CronProcessBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.baseCurrency = params.baseCurrency;
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
   * @sets oThis.auxChainId
   *
   * @return {Promise<never>}
   */
  async validateAndSanitize() {
    const oThis = this;

    // Call validate method of base class.
    oThis.validateCronKind();

    // Parameter validations.
    if (!CommonValidators.validateNonZeroInteger(oThis.auxChainId)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_cp_upopp_1',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    if (!CommonValidators.validateString(oThis.baseCurrency)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_cp_upopp_2',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    oThis.auxChainId = Number(oThis.auxChainId);

    await oThis.checkForExistingCronPerChain(cronProcessesConstants.auxChainIdKey, oThis.auxChainId);
  }

  /**
   * Set cron in cron processes table.
   *
   * @return {Promise<void>}
   */
  async set() {
    const oThis = this,
      cronParams = {
        auxChainId: oThis.auxChainId,
        baseCurrency: oThis.baseCurrency
      };

    // Create entry in cron process table.
    const cronProcessResponse = await oThis.insert(cronParams);

    return cronProcessResponse.insertId;
  }

  /**
   * Get cron kind.
   *
   * @sets oThis.cronKind
   */
  get getCronKind() {
    const oThis = this;

    oThis.cronKind = cronProcessesConstants.updatePriceOraclePricePoints;
  }
}

module.exports = UpdatePriceOraclePricePoints;
