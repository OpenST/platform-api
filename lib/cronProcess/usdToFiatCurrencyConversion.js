/**
 * Module for inserting cron which updates usd to fiat conversion in cron processes table.
 *
 * @module lib/cronProcess/UpdatePriceOraclePricePoints
 */

const rootPrefix = '../..',
  CronProcessBase = require(rootPrefix + '/lib/cronProcess/Base'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

/**
 * Class for inserting cron which updates price oracle price points in cron processes table.
 *
 * @class usdToFiatCurrencyConversion
 */
class usdToFiatCurrencyConversion extends CronProcessBase {
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
  }

  /**
   * Set cron in cron processes table.
   *
   * @return {Promise<void>}
   */
  async set() {
    const oThis = this,
      cronParams = {};

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

    oThis.cronKind = cronProcessesConstants.usdToFiatCurrencyConversion;
  }
}

module.exports = usdToFiatCurrencyConversion;
