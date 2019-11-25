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
  publishToPreProcessor = require(rootPrefix + '/lib/webhooks/publishToPreProcessor'),
  webhookSubscriptionsConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions'),
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
    oThis.webhookPreprocessorPayloadsArray = [];
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

    await oThis._sendWebhook();

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
    promisesArr.push(
      new FetchPendingTxData(oThis.chainId, oThis.transactionHashes).perform(),
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
    const pendingTransactionObj = new PendingTransactionCrud(oThis.chainId);
    for (const transactionHash in oThis.pendingTransactionsMap) {
      const pendingTxData = oThis.pendingTransactionsMap[transactionHash],
        // transactionHash = pendingTxData.transactionHash,
        transactionReceipt = oThis.transactionReceiptMap[transactionHash] || {};

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

      // If receipt is not present then don't update pending transaction
      if(pendingTxData.transactionUuid && transactionReceipt.hasOwnProperty('status')) {
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
          pendingTransactionObj.update(updateParams).catch(function (error) {
            // As we have code in finalizer to check and update status (if needed) we ignore any errors from here and proceed
            logger.error('_updateStatusesInDb failed in Post Transaction mining', updateParams, error);
          })
        );
      }

      await Promise.all(promiseArray);
    }

    // Mark tx meta status as success.
    if (receiptSuccessTxMetaIds.length > 0) {
      await oThis._markTransactionMetaMined(receiptSuccessTxMetaIds,
        transactionMetaConst.successReceiptStatus);
    }

    // Mark tx meta status as failure.
    if (receiptFailureTxMetaIds.length > 0) {
      await oThis._markTransactionMetaMined(receiptFailureTxMetaIds,
        transactionMetaConst.failureReceiptStatus);
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
   * Mark transaction meta as mined.
   *
   * @param ids
   * @param receiptStatus
   * @returns {Promise<void>}
   * @private
   */
  async _markTransactionMetaMined(ids, receiptStatus){
    const oThis = this;

    let submittedStatus = transactionMetaConst.invertedStatuses[transactionMetaConst.submittedToGethStatus],
      minedStatus = transactionMetaConst.invertedStatuses[transactionMetaConst.minedStatus];

    // Update transaction meta
    await new TransactionMeta()
      .update({status: minedStatus, receipt_status: transactionMetaConst.invertedReceiptStatuses[receiptStatus]})
      .where({id: ids, status: submittedStatus})
      .fire();
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

  /**
   * Send webhook
   *
   * @returns {Promise<void>}
   * @private
   */
  async _sendWebhook(){
    const oThis = this;

    for(const txHash in oThis.transactionMetaMap){
      let txMetaRec = oThis.transactionMetaMap[txHash];

      oThis.webhookPreprocessorPayloadsArray.push({
        webhookKind: webhookSubscriptionsConstants.transactionsMinedTopic,
        tokenId: txMetaRec.token_id,
        transactionUuid: txMetaRec.transaction_uuid
      })
    }

    await oThis._publishWebhookPreprocessorMessages();
  }

  /**
   * Publish messages in webhook preprocessor queue.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _publishWebhookPreprocessorMessages() {
    const oThis = this;

    const preprocessorPublishPromisesArray = [];

    for (let index = 0; index < oThis.webhookPreprocessorPayloadsArray.length; index++) {
      preprocessorPublishPromisesArray.push(
        publishToPreProcessor.perform(oThis.chainId, oThis.webhookPreprocessorPayloadsArray[index])
      );
    }

    await Promise.all(preprocessorPublishPromisesArray);
  }
}

module.exports = PostTransactionMinedSteps;
