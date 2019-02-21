'use strict';

const rootPrefix = '../../',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  rabbitmqProvider = require(rootPrefix + '/lib/providers/rabbitmq'),
  rabbitmqConstants = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  connectionTimeoutConst = require(rootPrefix + '/lib/globalConstant/connectionTimeout'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  FetchPendingTxData = require(rootPrefix + '/lib/transactions/FetchPendingTransactionsByHash');

const TX_FETCH_BATCH_SZ = 25;

class ProcessPendingTransaction {
  /**
   * @constructor
   *
   * @param params
   */
  constructor(params) {
    const oThis = this;

    oThis.chainId = params.chainId;
    oThis.blockNumber = params.blockNumber;
    oThis.transactionHashes = params.transactionHashes;

    oThis.dataToDelete = [];
  }

  /**
   * Perform pending transaction processing
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis._init();

    await oThis._checkAfterReceiptTasksAndPublish();

    await oThis._deletePendingTransactions();
  }

  /**
   * Initialize
   *
   * @return {Promise<void>}
   * @private
   */
  async _init() {
    const oThis = this;

    const blockScannerObj = await blockScannerProvider.getInstance([oThis.chainId]);

    oThis.chainCronDataModel = blockScannerObj.model.ChainCronData;
    oThis.PendingTransactionByHashCache = blockScannerObj.cache.PendingTransactionByHash;
    oThis.PendingTransactionByUuidCache = blockScannerObj.cache.PendingTransactionByUuid;
    oThis.PendingTransactionModel = blockScannerObj.model.PendingTransaction;

    oThis.openSTNotification = await rabbitmqProvider.getInstance(rabbitmqConstants.globalRabbitmqKind, {
      chainId: oThis.chainId,
      connectionWaitSeconds: connectionTimeoutConst.crons,
      switchConnectionWaitSeconds: connectionTimeoutConst.switchConnectionCrons
    });
  }

  /**
   * _checkAfterReceiptTasksAndPublish
   *
   * @return {Promise<void>}
   * @private
   */
  async _checkAfterReceiptTasksAndPublish() {
    const oThis = this;

    if (oThis.transactionHashes.length <= 0) return;

    let promises = [];

    // Deliberately avoided use of splice to avoid input variable modification
    let transactionChunks = [];

    let count = 0,
      tempArray = [];

    for (let i = 0; i < oThis.transactionHashes.length; i++) {
      tempArray.push(oThis.transactionHashes[i]);
      count = count + 1;
      if (count == TX_FETCH_BATCH_SZ) {
        transactionChunks.push(tempArray);
        tempArray = [];
        count = 0;
      }
    }

    if (count > 0) {
      transactionChunks.push(tempArray);
    }

    for (let chunkNo = 0; chunkNo < transactionChunks.length; chunkNo++) {
      let transactionHashes = transactionChunks[chunkNo];

      let fetchPendingTxData = new FetchPendingTxData(oThis.chainId, transactionHashes);

      // Don't remove the catch
      let ptxResp = await fetchPendingTxData.perform().catch(function(err) {
        logger.error(err);
        return responseHelper.error({
          internal_error_identifier: 'l_t_ptfs_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { err: err.toString() }
        });
      });

      if (ptxResp.isFailure()) {
        return ptxResp;
      }

      let pendingTransactionData = ptxResp.data;

      for (let txUuid in pendingTransactionData) {
        let ptd = pendingTransactionData[txUuid];

        oThis.dataToDelete.push(ptd);

        if (ptd.hasOwnProperty('afterReceipt')) {
          // Publish state root info for workflow to be able to proceed with other steps
          let publishPromise = new Promise(function(onResolve, onReject) {
            oThis
              ._publishAfterReceiptInfo(ptd.afterReceipt)
              .then(function(resp) {
                onResolve();
              })
              .catch(function(err) {
                logger.error('Could not publish transaction after receipt: ', err);
                onResolve();
              });
          });
          promises.push(publishPromise);
        }
      }
    }

    return Promise.all(promises);
  }

  /**
   * _publishAfterReceiptInfo
   *
   * @param publishParams - Params to publish message
   * @return {Promise<never>}
   * @private
   */
  async _publishAfterReceiptInfo(publishParams) {
    const oThis = this;

    if (!publishParams || publishParams == '') {
      return responseHelper.successWithData({});
    }

    let messageParams = JSON.parse(publishParams);

    let setToRMQ = await oThis.openSTNotification.publishEvent.perform(messageParams);

    // If could not set to RMQ run in async.
    if (setToRMQ.isFailure() || setToRMQ.data.publishedToRmq === 0) {
      logger.error("====Couldn't publish the message to RMQ====");
      return Promise.reject({ err: "Couldn't publish transaction pending for publish: " + publishParams });
    }

    logger.info('==== Pending transaction published ===');
  }

  /**
   * Delete pending transactions
   *
   * @return {Promise<void>}
   * @private
   */
  async _deletePendingTransactions() {
    const oThis = this,
      pendingTransactionModel = new oThis.PendingTransactionModel({
        chainId: oThis.chainId
      });

    if (oThis.dataToDelete.length > 0) {
      await pendingTransactionModel.batchDeleteItem(oThis.dataToDelete, coreConstants.batchDeleteRetryCount);
    }
  }
}

module.exports = ProcessPendingTransaction;
