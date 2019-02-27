'use strict';
/**
 * Mark fail and revert pessimistic balance.
 * This class the array of Tx Meta rows as input.
 *
 * @module lib/transactionErrorHandlers/queuedHandler
 */
const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/custom_console_logger'),
  BaseKlass = require(rootPrefix + '/lib/transactions/errorHandlers/base');

class MarkFailAndRollbackBalanceKlass extends BaseKlass {
  constructor(params) {
    super(params);
  }

  /**
   * Perform
   *
   * @returns {Promise}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(error) {
      logger.error('lib/transactionErrorHandlers/markFailAndRollbackBalance::perform::catch');
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

    await oThis.setConfigStrategies();

    await oThis.setPendingTxForFailedUuids(oThis.transactionUuidsToBeFailed);

    await oThis.markPendingTransactionFail();

    await oThis.releaseLockAndMarkTransactionMetaFail();

    await oThis._rollBackPessimisticDebit();

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

      oThis.transactionUuidsToBeFailed.push(txMeta.transaction_uuid);
      oThis.tokenIds.push(txMeta.token_id);
      oThis.txUuidToTxMetaMap[txMeta.transaction_uuid] = txMeta;
    }
  }
}

module.exports = MarkFailAndRollbackBalanceKlass;
