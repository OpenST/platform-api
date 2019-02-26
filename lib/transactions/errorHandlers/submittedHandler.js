'use strict';

/**
 * This script handles the transactions which are in submitted status in transaction_meta table for a long time.
 * It has two responsibilities:
 * 1. If a transaction in table is not found on geth, it resubmits the transaction and updates the specific transaction
 *    entry in the table.
 * 2. If a transaction is found in table as well as on geth, it sends an email to developers notifying them about such
 *    transactions and updates the specific transaction entry in the table.
 *
 * @module lib/transaction_error_handlers/submitted_handler
 */

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/custom_console_logger'),
  TransactionMetaModel = require(rootPrefix + '/app/models/mysql/TransactionMeta'),
  transactionMetaConst = require(rootPrefix + '/lib/globalConstant/transactionMeta');

require(rootPrefix + '/app/models/transaction_log');

/**
 * @constructor
 *
 * @param {Array} txMetaRows: rows of queued tx from txMeta table
 */
class SubmittedHandlerKlass {
  constructor() {}

  /**
   * Main performer for the class.
   *
   * @returns {Promise<T>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(error) {
      logger.error('lib/transaction_error_handlers/submitted_handler.js::perform::catch');
      logger.error(error);
    });
  }

  /**
   * Async performer for the class.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    return Promise.resolve();
  }
}

module.exports = SubmittedHandlerKlass;
