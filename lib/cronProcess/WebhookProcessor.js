/**
 * Class for inserting webhook preprocessor entry in cron processes table.
 *
 * @module lib/cronProcess/WebhookPreprocessor
 */

const rootPrefix = '../..',
  CronProcessBase = require(rootPrefix + '/lib/cronProcess/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  WebhookQueueModel = require(rootPrefix + '/app/models/mysql/WebhookQueue'),
  WebhookQueueConstants = require(rootPrefix + '/lib/globalConstant/webhookQueue'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

/**
 * Class for inserting webhook preprocessor entry in cron processes table.
 *
 * @class
 */
class WebhookProcessor extends CronProcessBase {
  /**
   * Constructor for inserting transaction parser entry in cron processes table.
   *
   * @param {object} params
   * @param {number/string} params.prefetchCount
   * @param {number/string} params.auxChainId
   * @param {number/string} params.sequenceNumber
   * @param {number/string} params.queueTopicSuffix: suffix to be add in topic & queue names.
   * @param {number/string} params.subscribeSubTopic: specific subtopic to be subscribe. add in topic & queue names.
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
    oThis.subscribeSubTopic = params.subscribeSubTopic;
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
          internal_error_identifier: 'l_cp_wp_1',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    if (!CommonValidators.validateNonZeroInteger(oThis.prefetchCount)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_cp_wp_2',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    if (!CommonValidators.validateNonZeroInteger(oThis.sequenceNumber)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_cp_wp_3',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    if (!oThis.queueTopicSuffix) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_cp_wp_4',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    if (!oThis.subscribeSubTopic) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_cp_wp_5',
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
        sequenceNumber: oThis.sequenceNumber,
        subscribeSubTopic: oThis.subscribeSubTopic
      };

    // Create entry in transaction cron process table.
    const webhookQueueResponse = await new WebhookQueueModel()
      .insert({
        chain_id: oThis.auxChainId,
        queue_topic_suffix: oThis.queueTopicSuffix,
        status: WebhookQueueConstants.invertedStatuses[WebhookQueueConstants.activeStatus]
      })
      .fire();

    // Create entry in cron process table.
    const cronProcessResponse = await oThis.insert(cronParams);

    // Update entry in transaction cron process table.
    await new WebhookQueueModel()
      .update(['cron_process_id = ?', cronProcessResponse.insertId])
      .where(['id = ?', webhookQueueResponse.insertId])
      .fire();
    logger.win('Cron process added successfully in transaction cron process table.');

    return cronProcessResponse.insertId;
  }

  /**
   * Get cron kind.
   */
  get getCronKind() {
    const oThis = this;

    oThis.cronKind = cronProcessesConstants.webhookProcessor;
  }
}

module.exports = WebhookProcessor;
