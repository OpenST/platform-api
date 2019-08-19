/**
 * Class for inserting track latest transaction in cron processes table.
 *
 * @module lib/cronProcess/TrackLatestTransaction
 */

const rootPrefix = '../..',
  CronProcessBase = require(rootPrefix + '/lib/cronProcess/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

/**
 * Class for inserting track latest transaction entry in cron processes table.
 *
 * @class
 */
class TrackLatestTransaction extends CronProcessBase {
  /**
   * Constructor for inserting track latest transaction entry in cron processes table.
   *
   * @param {object} params
   * @param {number/string} params.prefetchCount
   * @param {number/string} params.chainId
   * @param {number/string} params.sequenceNumber
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.chainId = params.chainId;
    oThis.prefetchCount = params.prefetchCount;
    oThis.sequenceNumber = params.sequenceNumber;
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
    if (!CommonValidators.validateNonNegativeInteger(oThis.chainId)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_cp_tlt_1',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    if (!CommonValidators.validateNonZeroInteger(oThis.prefetchCount)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_cp_tlt_2',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    if (!CommonValidators.validateNonZeroInteger(oThis.sequenceNumber)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_cp_tlt_3',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    oThis.chainId = Number(oThis.chainId);
    oThis.prefetchCount = Number(oThis.prefetchCount);
    oThis.sequenceNumber = Number(oThis.sequenceNumber);

    await oThis.checkLatestSequenceNumber(cronProcessesConstants.chainIdKey, oThis.chainId, oThis.sequenceNumber);
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
        chainId: oThis.chainId,
        prefetchCount: oThis.prefetchCount,
        sequenceNumber: oThis.sequenceNumber
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

    oThis.cronKind = cronProcessesConstants.trackLatestTransaction;
  }
}

module.exports = TrackLatestTransaction;
