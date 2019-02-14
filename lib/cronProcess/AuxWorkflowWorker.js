/**
 * Class for inserting aux workflow worker entry in cron processes table.
 *
 * @module lib/cronProcess/AuxWorkflowWorker
 */

const rootPrefix = '../..',
  CronProcessBase = require(rootPrefix + '/lib/cronProcess/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

/**
 * Class for inserting aux workflow worker entry in cron processes table.
 *
 * @class
 */
class AuxWorkflowWorker extends CronProcessBase {
  /**
   * Constructor for inserting aux workflow worker entry in cron processes table.
   *
   * @param {Object} params
   * @param {Number/String} params.prefetchCount
   * @param {Number/String} params.auxChainId
   * @param {Number/String} params.sequenceNumber
   * @param {Number/String} [params.id]
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.auxChainId = params.auxChainId;
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
          internal_error_identifier: 'l_co_aww_1',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    if (!CommonValidators.validateInteger(oThis.prefetchCount)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_co_aww_2',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }
    if (Number(oThis.prefetchCount) < 1) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_co_aww_3',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

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
    const oThis = this,
      cronParams = {
        auxChainId: oThis.auxChainId,
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

    oThis.cronKind = cronProcessesConstants.auxWorkflowWorker;
  }
}

module.exports = AuxWorkflowWorker;
