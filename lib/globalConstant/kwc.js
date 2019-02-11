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
   * Constructor for for KMS purposes.
   *
   * @constructor
   */
  constructor() {}

  get exTxQueueTopicName() {
    return 'execute_transaction_';
  }

  get executeTx() {
    return 'execute_transaction';
  }

  get commandMsg() {
    return 'command_message';
  }
}

module.exports = new Kwc();
