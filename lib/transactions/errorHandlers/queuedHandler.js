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

const rootPrefix = '../../..',
  ErrorHandlerBaseKlass = require(rootPrefix + '/lib/transactions/errorHandlers/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

require(rootPrefix + '/lib/transactions/ProcessRmqMessage');

class QueuedHandlerKlass extends ErrorHandlerBaseKlass {
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
    oThis.transactionUuidsToBeSubmitted = [];
  }

  /**
   *
   * @returns {Promise<*>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis.validate();

    await oThis._initializeVariables();

    await oThis.setConfigStrategies();

    await oThis.setPendingTxForUuids(oThis.allUuids);

    await oThis._submitValidTransactions();

    await oThis.markFailAndRollbackBalance();

    return true;
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
        return Promise.reject('Some of records have mismatch lock id. Releasing lock for lock id:' + oThis.lockId);
      }

      if (txMeta.sender_nonce) {
        oThis.transactionUuidsToBeSubmitted.push(txMeta.transaction_uuid);
      } else {
        oThis.transactionUuidsToBeFailed.push(txMeta.transaction_uuid);
      }
      console.log('--oThis.transactionUuidsToBeSubmitted-------', oThis.transactionUuidsToBeSubmitted);
      console.log('--oThis.transactionUuidsToBeFailed-------', oThis.transactionUuidsToBeFailed);
      oThis.allUuids.push(txMeta.transaction_uuid);
      oThis.tokenIds.push(txMeta.token_id);
      oThis.txUuidToTxMetaMap[txMeta.transaction_uuid] = txMeta;
    }
    return {};
  }

  /**
   * Submit valid transactions.
   *
   * @returns {Promise}
   */
  async _submitValidTransactions() {
    const oThis = this;

    for (let i = 0; i < oThis.transactionUuidsToBeSubmitted.length; i++) {
      let txUuid = oThis.transactionUuidsToBeSubmitted[i],
        txMeta = oThis.txUuidToTxMetaMap[txUuid],
        ic = oThis.tokenIdToInstanceComposerMap[txMeta.token_id];

      let ProcessRmqExecuteTxMessage = ic.getShadowedClassFor(coreConstants.icNameSpace, 'ProcessRmqExecuteTxMessage');

      let processRmqExecuteTxMessage = new ProcessRmqExecuteTxMessage({
        transactionUuid: txUuid,
        transactionMetaId: txMeta.id,
        fromAddress: txMeta.sender_address,
        fromAddressNonce: txMeta.sender_nonce
      });

      // Process Ex Tx Message
      await processRmqExecuteTxMessage.perform();
    }
  }
}

module.exports = QueuedHandlerKlass;
