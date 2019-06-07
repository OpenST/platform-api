/**
 * Class for inserting webhook error handler entry in cron processes table.
 *
 * @module lib/cronProcess/WebhookErrorHandler
 */

const rootPrefix = '../..',
  CronProcessBase = require(rootPrefix + '/lib/cronProcess/Base'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

/**
 * Class for inserting webhook error handler entry in cron processes table.
 *
 * @class WebhookErrorHandler
 */
class WebhookErrorHandler extends CronProcessBase {
  /**
   * Constructor for inserting webhook error handler entry in cron processes table.
   *
   * @param {object} params
   * @param {number/string} params.sequenceNumber
   *
   * @augments CronProcessBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.auxChainId = 0; // TODO: @Shlok - Update sequenceNumber method to work without chainId.
    oThis.sequenceNumber = params.sequenceNumber;
  }

  /**
   * Main performer of class.
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
    oThis.validateCronKind();

    // Parameter validations.
    if (!CommonValidators.validateNonNegativeInteger(oThis.auxChainId)) {
      // TODO: @Shlok - Change this as well later when above todo is taken care of,
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_cp_weh_1',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    if (!CommonValidators.validateNonZeroInteger(oThis.sequenceNumber)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_cp_weh_3',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    oThis.auxChainId = Number(oThis.auxChainId);
    oThis.sequenceNumber = Number(oThis.sequenceNumber);

    await oThis.checkLatestSequenceNumber(cronProcessesConstants.auxChainIdKey, oThis.auxChainId, oThis.sequenceNumber);
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

    oThis.cronKind = cronProcessesConstants.webhookErrorHandler;
  }
}

module.exports = WebhookErrorHandler;
