/**
 * Module for webhook processor constants.
 *
 * @module lib/globalConstant/webhookProcessor
 */

/**
 * Class for webhook processor constants.
 *
 * @class WebhookProcessorConstants
 */
class WebhookProcessorConstants {
  get topics() {
    return ['webhookProcessor'];
  }

  get publisher() {
    return 'OST-Webhooks';
  }

  get messageKind() {
    return 'webhooksProcessor';
  }

  // Topic Name prefix
  get processorQueueTopicPrefix() {
    return 'webhook_processor';
  }

  /**
   * Get topic name for webhook processor queues.
   *
   * @param {string} chainId
   * @param {string} queueTopicSuffix
   * @param {string} subTopic
   *
   * @returns {string}
   */
  processorTopicName(chainId, queueTopicSuffix, subTopic) {
    const oThis = this;

    return `${oThis.processorQueueTopicPrefix}.${chainId}.${queueTopicSuffix}.${subTopic}`;
  }

  /**
   * Get queue name for webhook processor queues.
   *
   * @param {string} chainId
   * @param {string} queueTopicSuffix
   * @param {string} subTopic
   *
   * @returns {string}
   */
  processorQueueName(chainId, queueTopicSuffix, subTopic) {
    const oThis = this;

    return `${oThis.processorQueueTopicPrefix}_${chainId}_${queueTopicSuffix}_${subTopic}`;
  }
}

module.exports = new WebhookProcessorConstants();
