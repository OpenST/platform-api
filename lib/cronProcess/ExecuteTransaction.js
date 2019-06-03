/**
 * Class for inserting execute transaction worker entry in cron processes table.
 *
 * @module lib/cronProcess/AuxWorkflowWorker
 */

const rootPrefix = '../..',
  CronProcessBase = require(rootPrefix + '/lib/cronProcess/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  TxCronProcessDetailsModel = require(rootPrefix + '/app/models/mysql/TxCronProcessDetail');

/**
 * Class for inserting execute transaction worker entry in cron processes table.
 *
 * @class
 */
class ExecuteTransaction extends CronProcessBase {
  /**
   * Constructor for inserting execute transaction worker entry in cron processes table.
   *
   * @param {object} params
   * @param {number/string} params.prefetchCount
   * @param {number/string} params.auxChainId
   * @param {number/string} params.sequenceNumber
   * @param {string} params.queueTopicSuffix
   * @param {number/string} [params.id]
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.prefetchCount = params.prefetchCount;
    oThis.sequenceNumber = params.sequenceNumber;
    oThis.queueTopicSuffix = params.queueTopicSuffix;
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
          internal_error_identifier: 'l_cp_et_1',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    if (!CommonValidators.validateNonZeroInteger(oThis.prefetchCount)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_cp_et_2',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    if (!CommonValidators.validateNonZeroInteger(oThis.sequenceNumber)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_cp_et_4',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    if (!oThis.queueTopicSuffix) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_cp_et_6',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    oThis.auxChainId = Number(oThis.auxChainId);
    oThis.prefetchCount = Number(oThis.prefetchCount);
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
    const oThis = this,
      cronParams = {
        auxChainId: oThis.auxChainId,
        prefetchCount: oThis.prefetchCount,
        sequenceNumber: oThis.sequenceNumber
      };

    // Create entry in transaction cron process table.
    const transactionCronProcessResponse = await new TxCronProcessDetailsModel()
      .insert({
        chain_id: oThis.auxChainId,
        queue_topic_suffix: oThis.queueTopicSuffix
      })
      .fire();

    // Create entry in cron process table.
    const cronProcessResponse = await oThis.insert(cronParams);

    // Update entry in transaction cron process table.
    await new TxCronProcessDetailsModel()
      .update(['cron_process_id = ?', cronProcessResponse.insertId])
      .where(['id = ?', transactionCronProcessResponse.insertId])
      .fire();
    logger.win('Cron process added successfully in transaction cron process table.');

    return cronProcessResponse.insertId;
  }

  /**
   * Get cron kind.
   */
  get getCronKind() {
    const oThis = this;

    oThis.cronKind = cronProcessesConstants.executeTransaction;
  }
}

module.exports = ExecuteTransaction;
