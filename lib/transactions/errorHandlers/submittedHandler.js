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
  BaseKlass = require(rootPrefix + '/lib/transactions/errorHandlers/base'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  TransactionMetaModel = require(rootPrefix + '/app/models/mysql/TransactionMeta'),
  transactionMetaConst = require(rootPrefix + '/lib/globalConstant/transactionMeta');

require(rootPrefix + '/app/models/transaction_log');

/**
 * @constructor
 *
 * @param {Array} txMetaRows: rows of queued tx from txMeta table
 */
class SubmittedHandlerKlass extends BaseKlass {
  constructor(params) {
    super(params);
    const oThis = this;
  }

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

    await oThis.validate();

    await oThis.setConfigStrategies();

    await oThis.checkTransactionSubmitted();

    return Promise.resolve();
  }

  async validate() {
    const oThis = this;

    for (let i = 0; i < oThis.transactionsMetaRecords.length; i++) {
      let txMeta = oThis.transactionsMetaRecords[i];

      //if any of the lock is not matching release lock on all rows and return.
      if (txMeta.lock_id !== oThis.lockId) {
        return Promise.reject('Some of records have mismatch lock id. Releasing lock for lock id:' + oThis.lockId);
      }

      oThis.allUuids.push(txMeta.transaction_uuid);
      oThis.tokenIds.push(txMeta.token_id);
      oThis.txUuidToTxMetaMap[txMeta.transaction_uuid] = txMeta;
    }
  }

  async checkTransactionSubmitted() {
    const oThis = this;

    for (let txUuid in oThis.txUuidToTxMetaMap) {
      let txMeta = oThis.txUuidToTxMetaMap[txUuid],
        configStrategy = oThis.oThis.tokenIdToInstanceComposerMap[txMeta.token_id].configStrategy,
        configObject = new ConfigStrategyObject(configStrategy),
        readOnlyWsProviders = configObject.auxChainWsProviders('readOnly');

      if (!txMeta.transaction_hash) {
        //Mark as FinalFailedStatus and rollback balance
        oThis.transactionUuidsToBeFailed.push(txUuid);
      } else {
        let transaction = await web3Provider
          .getInstance(readOnlyWsProviders[0])
          .getTransaction(txMeta.transaction_hash);
        if (transaction) {
          //Add new next_action_at and wait till it succeeded
          await oThis.markNextActionAtAndReleaseLock();
        } else if (txMeta.retry_count <= 5) {
          //resubmit
          await oThis.resubmitTransaction(txMeta);
        } else {
          //Mark as FinalFailedStatus and rollback balance
          oThis.transactionUuidsToBeFailed.push(txUuid);
        }
      }
    }
  }

  async markNextActionAtAndReleaseLock() {}

  async resubmitTransaction(txMeta) {
    return Promise.resolve({});
  }
}

module.exports = SubmittedHandlerKlass;
