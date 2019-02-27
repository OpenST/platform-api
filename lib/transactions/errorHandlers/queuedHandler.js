'use strict';
/**
 * This script handles the transactions which are in queued status in transaction_meta table for a long time.
 * This class the array of Tx Meta rows as input.
 * It has two responsibilities :
 * 1. In transaction_meta table: marks 'status' as 'failed' and sets 'next_action_at' to 'NULL'.
 * 2. In transaction_log table: marks 'status' as 'failed'.
 *
 * @module lib/transactionErrorHandlers/queuedHandler
 */

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/custom_console_logger'),
  BaseKlass = require(rootPrefix + '/lib/transactions/errorHandlers/base'),
  TransactionMetaModel = require(rootPrefix + '/app/models/mysql/TransactionMeta'),
  transactionMetaConst = require(rootPrefix + '/lib/globalConstant/transactionMeta');

class QueuedHandlerKlass extends BaseKlass {
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.transactionsTobeSubmitted = [];
  }

  /**
   * Perform
   *
   * @returns {Promise}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(error) {
      logger.error('lib/transaction_error_handlers/queued_handler.js::perform::catch');
      logger.error(error);
    });
  }

  /**
   *
   * @returns {Promise<*>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis.validate();

    return true;
  }

  async validate() {
    const oThis = this;

    for (let i = 0; i < oThis.transactionsMetaRecords.length; i++) {
      let txMeta = oThis.transactionsMetaRecords[i];

      //if any of the lock is not matching release lock on all rows and return.
      if (txMeta.lock_id !== oThis.lockId) {
        return Promise.reject({});
      }

      oThis.transactionsTobeSubmitted.push(txMeta.transaction_uuid);
      oThis.transactionUuidsToBeFailed.push(txMeta.transaction_uuid);
      oThis.tokenIds.push(txMeta.token_id);
      oThis.txUuidToTxMetaMap[txMeta.transaction_uuid] = txMeta;
    }
  }
}

module.exports = QueuedHandlerKlass;
