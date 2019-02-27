'use strict';
/**
 * Mark fail and revert pessimistic balance.
 * This class the array of Tx Meta rows as input.
 *
 * @module lib/transactionErrorHandlers/queuedHandler
 */

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/custom_console_logger'),
  TransactionMetaModel = require(rootPrefix + '/app/models/mysql/TransactionMeta'),
  transactionMetaConst = require(rootPrefix + '/lib/globalConstant/transactionMeta'),
  FetchPendingTransactionsByUuid = require(rootPrefix + '/lib/transactions/FetchPendingTransactionsByUuid'),
  PendingTransactionCrud = require(rootPrefix + '/lib/transactions/PendingTransactionCrud'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

class MarkFailAndRollbackBalanceKlass {
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.lockId = params.lockId;
    oThis.transactionsMetaRecords = params.transactionsMetaRecords;

    oThis.transactionUuids = [];
    oThis.pendingTransactionsMap = {};
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

    oThis.validate();

    await oThis.getPendingTransaction();

    await oThis.markPendingTransactionFail();

    await oThis.markTransactionMetaFail();

    await oThis.rollbackBalance();

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

      oThis.transactionUuids.push(txMeta.transaction_uuid);
    }
  }

  async getPendingTransaction() {
    const oThis = this;

    let fetchPendingTxRsp = await new FetchPendingTransactionsByUuid(
      oThis.auxChainId,
      oThis.transactionUuids
    ).perform();
    oThis.pendingTransactionsMap = fetchPendingTxRsp.data;
  }

  async markPendingTransactionFail() {
    const oThis = this;
    let promisesArray = [];

    for (let i = 0; i < oThis.transactionUuids.length; i++) {
      let promise = new PendingTransactionCrud(oThis.chainId)
        .update({
          transactionUuid: oThis.transactionUuids[i],
          status: pendingTransactionConstants.failedStatus
        })
        .then()
        .catch(function(updatePendingTxError) {
          // Do nothing
        });
      promisesArray.push(promise);
    }
    await Promise.all(promisesArray);
  }

  async markTransactionMetaFail(uuid) {}

  async rollbackBalance() {}
}

module.exports = MarkFailAndRollbackBalanceKlass;
