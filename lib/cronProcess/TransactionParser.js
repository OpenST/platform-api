/**
 * Class for inserting transaction parser entry in cron processes table.
 *
 * @module lib/cronProcess/TransactionParser
 */

const rootPrefix = '../..',
  CronProcessBase = require(rootPrefix + '/lib/cronProcess/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

/**
 * Class for inserting transaction parser entry in cron processes table.
 *
 * @class
 */
class TransactionParser extends CronProcessBase {
  /**
   * Constructor for inserting transaction parser entry in cron processes table.
   *
   * @param {Object} params
   * @param {Number/String} params.prefetchCount
   * @param {Number/String} params.chainId
   * @param {Number/String} params.sequenceNumber
   * @param {Number/String} [params.id]
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

    await oThis.validate();

    await oThis.set();
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
    if (!CommonValidators.validateInteger(oThis.chainId)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_co_tp_1',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    if (!CommonValidators.validateInteger(oThis.prefetchCount)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_co_tp_2',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }
    if (Number(oThis.prefetchCount) < 1) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_co_tp_3',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    if (!CommonValidators.validateInteger(oThis.sequenceNumber)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_co_tp_4',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }
    if (Number(oThis.sequenceNumber) < 1) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_co_tp_5',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

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
        intentionalBlockDelay: oThis.intentionalBlockDelay,
        sequenceNumber: oThis.sequenceNumber
      };

    await oThis.insert(cronParams);
  }

  /**
   * Get cron kind.
   */
  get getCronKind() {
    const oThis = this;

    oThis.cronKind = cronProcessesConstants.transactionParser;
  }
}

module.exports = TransactionParser;