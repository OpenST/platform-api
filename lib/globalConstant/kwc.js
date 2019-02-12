'use strict';
/**
 * Global constants for KWC purposes.
 *
 * @module lib/globalConstant/kwc
 */

/**
 * Class for for KWC purposes.
 *
 * @class
 */
class Kwc {
  /**
   * Constructor for for KWS purposes.
   *
   * @constructor
   */
  constructor() {}

  // Topic Name prefix
  get exTxQueueTopicPrefix() {
    return 'execute_transaction_';
  }

  get commandMessageQueueTopicPrefix() {
    return 'command_message_';
  }
  // Message types
  get executeTx() {
    return 'execute_transaction';
  }

  get commandMsg() {
    return 'command_message';
  }

  /**
   * Get topic name for Ex tx queues.
   * @param chainId
   * @param queueTopicSuffix
   * @returns {string}
   */
  exTxTopicName(chainId, queueTopicSuffix) {
    const oThis = this;
    return oThis.exTxQueueTopicPrefix + chainId + '.' + queueTopicSuffix;
  }

  /**
   * Get topic name for command message  queues.
   * @param chainId
   * @param queueTopicSuffix
   * @returns {string}
   */
  commandMessageTopicName(chainId, queueTopicSuffix) {
    const oThis = this;
    return oThis.commandMessageQueueTopicPrefix + chainId + '.' + queueTopicSuffix;
  }

  /**
   * Get queue name for Ex tx queues.
   * @param chainId
   * @param queueTopicSuffix
   * @returns {string}
   */
  exTxQueueName(chainId, queueTopicSuffix) {
    const oThis = this;
    return oThis.exTxQueueTopicPrefix + chainId + '_' + queueTopicSuffix;
  }

  /**
   * Get Queue name for command message queues.
   * @param chainId
   * @param queueTopicSuffix
   * @returns {string}
   */
  commandMessageQueueName(chainId, queueTopicSuffix) {
    const oThis = this;
    return oThis.commandMessageQueueTopicPrefix + chainId + '_' + queueTopicSuffix;
  }
}

module.exports = new Kwc();
