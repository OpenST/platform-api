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

const rootPrefix = '../../..',
  ErrorHandlerBaseKlass = require(rootPrefix + '/lib/transactions/errorHandlers/base'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  TransactionMetaModel = require(rootPrefix + '/app/models/mysql/TransactionMeta'),
  transactionMetaConst = require(rootPrefix + '/lib/globalConstant/transactionMeta');

require(rootPrefix + '/lib/transactions/ProcessRmqMessage');

/**
 * @constructor
 *
 * @param {Array} txMetaRows: rows of queued tx from txMeta table
 */
class SubmittedHandlerKlass extends ErrorHandlerBaseKlass {
  /**
   * constructor
   *
   * @param params
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.allUuids = [];
    oThis.transactionUuidsToBeReSubmitted = [];
  }

  /**
   * Async performer for the class.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis.validate();

    await oThis._initializeVariables();

    await oThis.setConfigStrategies();

    await oThis._checkTransactionSubmitted();

    await oThis.setPendingTxForUuids(oThis.transactionUuidsToBeFailed);

    await oThis._resubmitTransactions();

    await oThis.markFailAndRollbackBalance();

    return Promise.resolve();
  }

  /**
   * Initialize necessary variables
   *
   * @returns {Promise}
   * @private
   */
  async _initializeVariables() {
    const oThis = this;

    for (let i = 0; i < oThis.transactionsMetaRecords.length; i++) {
      let txMeta = oThis.transactionsMetaRecords[i];

      //if any of the lock is not matching release lock on all rows and return.
      if (txMeta.lock_id != oThis.lockId) {
        return Promise.reject(
          'Some of records have mismatch lock id. Releasing lock for lock id:' +
            oThis.lockId +
            '---metaLock: ' +
            txMeta.lock_id
        );
      }

      oThis.allUuids.push(txMeta.transaction_uuid);
      oThis.tokenIds.push(txMeta.token_id);
      oThis.txUuidToTxMetaMap[txMeta.transaction_uuid] = txMeta;
    }
  }

  /**
   * Check transaction is already present in geth or not. if not resubmit, else wait.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _checkTransactionSubmitted() {
    const oThis = this;

    for (let txUuid in oThis.txUuidToTxMetaMap) {
      let txMeta = oThis.txUuidToTxMetaMap[txUuid],
        ic = oThis.tokenIdToInstanceComposerMap[txMeta.token_id],
        configObject = new ConfigStrategyObject(ic.configStrategy),
        readWriteWsProviders = configObject.auxChainWsProviders('readWrite');

      if (!txMeta.transaction_hash || !txMeta.sender_address) {
        //Mark as FinalFailedStatus and rollback balance
        oThis.transactionUuidsToBeFailed.push(txUuid);
      } else {
        let transaction = null,
          promiseArray = [];
        for (let index = 0; index < readWriteWsProviders.length; index++) {
          promiseArray.push(
            web3Provider
              .getInstance(readWriteWsProviders[index])
              .getTransaction(txMeta.transaction_hash)
              .then(function(rsp) {
                if (rsp) {
                  transaction = rsp;
                }
              })
          );
        }
        await Promise.all(promiseArray);

        if (transaction) {
          //Add new next_action_at and wait till it succeeded
          await oThis._markNextActionAtAndReleaseLock(txMeta);
        } else if (txMeta.retry_count <= 10) {
          //resubmit
          oThis.transactionUuidsToBeReSubmitted.push(txUuid);
        } else {
          //Mark as FinalFailedStatus and rollback balance
          oThis.transactionUuidsToBeFailed.push(txUuid);
        }
      }
    }

    console.log('---oThis.transactionUuidsToBeReSubmitted-----------------', oThis.transactionUuidsToBeReSubmitted);
    console.log('---oThis.transactionUuidsToBeFailed----------------------', oThis.transactionUuidsToBeFailed);
  }

  /**
   * Mark next action and release lock.
   *
   * @param txMeta
   * @returns {Promise}
   * @private
   */
  async _markNextActionAtAndReleaseLock(txMeta) {
    const oThis = this;

    return new TransactionMetaModel()
      .update([
        'lock_id = NULL, retry_count = retry_count+1, next_action_at = ?',
        transactionMetaConst.getNextActionAtFor(transactionMetaConst.statuses[txMeta.status])
      ])
      .where(['id=? AND lock_id=?', txMeta.id, oThis.lockId])
      .fire();
  }

  /**
   * resubmit transaction.
   *
   * @returns {Promise}
   * @private
   */
  async _resubmitTransactions() {
    const oThis = this;

    for (let i = 0; i < oThis.transactionUuidsToBeReSubmitted.length; i++) {
      let txUuid = oThis.transactionUuidsToBeReSubmitted[i],
        txMeta = oThis.txUuidToTxMetaMap[txUuid],
        ic = oThis.tokenIdToInstanceComposerMap[txMeta.token_id],
        ProcessRmqExecuteTxMessage = ic.getShadowedClassFor(coreConstants.icNameSpace, 'ProcessRmqExecuteTxMessage');

      let processRmqExecuteTxMessage = new ProcessRmqExecuteTxMessage({
        transactionUuid: txUuid,
        transactionMetaId: txMeta.id,
        fromAddress: txMeta.sender_address,
        fromAddressNonce: txMeta.sender_nonce,
        resubmission: 1
      });

      // Process Ex Tx Message
      await processRmqExecuteTxMessage.perform();
    }
    return {};
  }
}

module.exports = SubmittedHandlerKlass;
