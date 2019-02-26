'use strict';
/**
 * This class takes array of Tx Meta rows as input.
 *
 * Flow:
 * 1. Change Transaction meta status to queued.
 * 2. Call transfer_bt once again on the transaction.
 *
 * @module lib/transaction_error_handlers/geth_down_handler
 */

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/custom_console_logger'),
  TransactionMetaModel = require(rootPrefix + '/app/models/mysql/TransactionMeta'),
  transactionMetaConst = require(rootPrefix + '/lib/globalConstant/transactionMeta');

// registering the objects and classes in instance composer
require(rootPrefix + '/lib/transactions/transfer_bt');

/**
 * @constructor
 *
 * @param {Array<object>} tx_meta_rows: rows of queued tx from txMeta table
 */
class GethDownHandlerKlass {
  constructor() {}

  /**
   * Main performer for the class.
   *
   * @returns {Promise}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(error) {
      logger.error('lib/transaction_error_handlers/geth_down_handler.js::perform::catch');
      logger.error(error);
    });
  }

  /**
   * Async performer for the class.
   *
   * @returns {Promise<*>}
   */
  async asyncPerform() {
    const oThis = this;

    return Promise.resolve();
  }
}

module.exports = GethDownHandlerKlass;
