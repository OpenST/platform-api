/**
 * This module does things needed after transaction is mined.
 *
 * @module lib/transactions/PostTransactionMinedSteps.js
 */
const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  NonceForSession = require(rootPrefix + '/lib/nonce/get/ForSession'),
  PendingTransactionCrud = require(rootPrefix + '/lib/transactions/PendingTransactionCrud'),
  FetchPendingTxData = require(rootPrefix + '/lib/transactions/FetchPendingTransactionsByHash'),
  TransactionMeta = require(rootPrefix + '/app/models/mysql/TransactionMeta'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  transactionMetaConst = require(rootPrefix + '/lib/globalConstant/transactionMeta'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

class PostTransactionMinedSteps {
  /**
   * @constructor
   *
   * @param params
   */
  constructor(params) {
    const oThis = this;

    oThis.chainId = params.chainId;
    oThis.transactionHashes = params.transactionHashes;
    oThis.transactionReceiptMap = params.transactionReceiptMap;

    oThis.pendingTransactionsMap = {};
    oThis.transactionMetaMap = {};
  }

  /**
   * Perform post transaction mining steps
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis._fetchTransactionDetails();

    await oThis._updateStatusesInDb();

    return responseHelper.successWithData({});
  }

  /**
   * Fetch transactions from Pending transactions and transaction meta
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchTransactionDetails(){
    const oThis = this;

    // Fetch pending transactions and transaction meta for given transaction hashes
    let promisesArr = [];
    const pendingTransactionObj = new PendingTransactionCrud(oThis.chainId);
    promisesArr.push(
      new FetchPendingTxData(oThis.chainId, oThis.transactionHashes, false).perform(),
      new TransactionMeta().fetchByTransactionHashes(oThis.chainId, oThis.transactionHashes)
    );
    let promiseResponses = await Promise.all(promisesArr);
    let fetchPendingTxResp = promiseResponses[0];
    if (fetchPendingTxResp.isFailure()) {
      return Promise.reject(fetchPendingTxResp);
    }
    oThis.pendingTransactionsMap = fetchPendingTxResp.data;

    // Make a map of transaction hash and txMeta
    let txMetaObjects = promiseResponses[1];
    for(let i=0;i<txMetaObjects.length;i++){
      let rec = txMetaObjects[i];
      oThis.transactionMetaMap[rec.transaction_hash] = rec;
    }
  }

  /**
   * Update statuses in pending tx and tx meta.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _updateStatusesInDb() {
    const oThis = this;

    const receiptSuccessTxMetaIds = [],
      receiptFailureTxMetaIds = [],
      unknownTxHashes = [],
      flushNonceCacheForSessionAddresses = [];
    let promiseArray = [];

    // Update Pending tx.
    const pendingTransactionObj = new PendingTransactionCrud(oThis.chainId)
    for (const pendingTxUuid in oThis.pendingTransactionsMap) {
      const pendingTxData = oThis.pendingTransactionsMap[pendingTxUuid],
        transactionHash = pendingTxData.transactionHash,
        transactionReceipt = oThis.transactionReceiptMap[transactionHash];

      const transactionStatus = !(transactionReceipt.status == '0x0' || transactionReceipt.status === false);
      // Look if transaction meta is present for transaction hash to update
      if(oThis.transactionMetaMap[transactionHash]){
        if(transactionStatus){
          receiptSuccessTxMetaIds.push(oThis.transactionMetaMap[transactionHash].id);
        } else {
          receiptFailureTxMetaIds.push(oThis.transactionMetaMap[transactionHash].id);
          if (pendingTxData.sessionKeyAddress) {
            flushNonceCacheForSessionAddresses.push(pendingTxData.sessionKeyAddress);
          }
        }
      } else {
        unknownTxHashes.push(transactionHash);
      }

      const updateParams = {
        chainId: oThis.chainId,
        transactionUuid: pendingTxData.transactionUuid,
        status:
          transactionStatus && transactionReceipt.internalStatus
            ? pendingTransactionConstants.minedStatus
            : pendingTransactionConstants.failedStatus,
        blockNumber: transactionReceipt.blockNumber,
        blockTimestamp: transactionReceipt.blockTimestamp
      };

      promiseArray.push(
        pendingTransactionObj.update(updateParams).catch(function(error) {
          // As we have code in finalizer to check and update status (if needed) we ignore any errors from here and proceed
          logger.error('_updateStatusesInDb failed in Post Transaction mining', updateParams, error);
        })
      );

      if (promiseArray.length === TX_BATCH_SIZE) {
        await Promise.all(promiseArray);
        promiseArray = [];
      }
    }

    if (promiseArray.length > 0) {
      await Promise.all(promiseArray);
    }

    // Mark tx meta status as success.
    if (receiptSuccessTxMetaIds.length > 0) {
      await new TransactionMeta().updateRecordsWithoutReleasingLock({
        status: transactionMetaConst.minedStatus,
        receiptStatus: transactionMetaConst.successReceiptStatus,
        ids: receiptSuccessTxMetaIds,
        chainId: oThis.chainId
      });
    }

    // Mark tx meta status as failure.
    if (receiptFailureTxMetaIds.length > 0) {
      await new TransactionMeta().updateRecordsWithoutReleasingLock({
        status: transactionMetaConst.minedStatus,
        receiptStatus: transactionMetaConst.failureReceiptStatus,
        ids: receiptFailureTxMetaIds,
        chainId: oThis.chainId
      });
    }

    // If unknown transactions are present then nothing needs to be done for them as of now
    if(unknownTxHashes.length > 0){
      logger.info('_updateStatusesInDb in Post Transaction mining has some unknown transactions: ', unknownTxHashes);
    }

    // Flush session nonce cache
    if (flushNonceCacheForSessionAddresses.length > 0) {
      await oThis._flushNonceCacheForSessionAddresses(flushNonceCacheForSessionAddresses);
    }
  }

  /**
   * Flush nonce cache.
   *
   * @param {array} addresses
   * @private
   */
  async _flushNonceCacheForSessionAddresses(addresses) {
    const oThis = this;

    const promises = [];

    if (!oThis.chainId) {
      logger.error('_flushNonceCacheForSessionAddresses chainIdNotFound in post transaction mining');

      return;
    }

    for (let index = 0; index < addresses.length; index++) {
      promises.push(
        new NonceForSession({
          address: addresses[index],
          chainId: oThis.chainId
        }).clear()
      );
    }

    await Promise.all(promises);
  }
}

module.exports = PostTransactionMinedSteps;
