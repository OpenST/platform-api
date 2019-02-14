/**
 * Class for inserting cron which updates price oracle price points in cron processes table.
 *
 * @module lib/cronProcess/UpdatePriceOraclePricePoints
 */

const rootPrefix = '../..',
  CronProcessBase = require(rootPrefix + '/lib/cronProcess/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

/**
 * Class for inserting cron which updates price oracle price points in cron processes table.
 *
 * @class
 */
class UpdatePriceOraclePricePoints extends CronProcessBase {
  /**
   * Constructor for inserting cron which updates price oracle price points in cron processes table.
   *
   * @param {Object} params
   * @param {Number/String} params.auxChainId
   * @param {Number/String} [params.id]
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.auxChainId = params.auxChainId;
  }

  /**
   * Main performer of the class.
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis.validate();

    return oThis.set();
  }

  /**
   * Validate cron params.
   *
   * @return {Promise<never>}
   *
   * @private
   */
  async validate() {
    const oThis = this;

    // Call validate method of base class.
    oThis.validateCronKind();

    // Parameter validations.
    if (!CommonValidators.validateInteger(oThis.auxChainId)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_co_upopp_1',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    await oThis.checkForExistingCronPerChain(cronProcessesConstants.auxChainIdKey, oThis.auxChainId);
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
        auxChainId: oThis.auxChainId
      };

    // Create entry in cron process table.
    let cronProcessResponse = await oThis.insert(cronParams);

    return cronProcessResponse.insertId;
  }

  /**
   * Get cron kind.
   */
  get getCronKind() {
    const oThis = this;

    oThis.cronKind = cronProcessesConstants.updatePriceOraclePricePoints;
  }
}

module.exports = UpdatePriceOraclePricePoints;
