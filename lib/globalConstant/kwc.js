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
  get exTxQueueTopicName() {
    return 'execute_transaction_';
  }

  // Message types
  get executeTx() {
    return 'execute_transaction';
  }

  get commandMsg() {
    return 'command_message';
  }
}

module.exports = new Kwc();
