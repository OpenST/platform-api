'use strict';

const rootPrefix = '../../',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  rabbitmqProvider = require(rootPrefix + '/lib/providers/rabbitmq'),
  rabbitmqConstants = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  connectionTimeoutConst = require(rootPrefix + '/lib/globalConstant/connectionTimeout'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
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
    oThis.txHashPendingTxDataMap = params.txHashPendingTxDataMap;

    oThis.dataToDelete = [];
  }

  /**
   * Perform pending transaction processing
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this;

    if (oThis.transactionHashes.length === 0) {
      return;
    }

    await oThis._init();

    await oThis._fetchPendingTransactionData();

    await oThis._checkAfterReceiptTasksAndPublish();

    await oThis._deletePendingTransactions();

    return responseHelper.successWithData({});
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
  }

  /**
   *
   * @private
   */
  async _fetchPendingTransactionData() {
    const oThis = this;

    if (oThis.txHashPendingTxDataMap) {
      return;
    }

    let fetchPendingTxData = await new FetchPendingTxData(oThis.chainId, oThis.transactionHashes, false).perform();

    if (fetchPendingTxData.isFailure()) {
      return fetchPendingTxData;
    }

    oThis.txHashPendingTxDataMap = fetchPendingTxData.data;
  }

  /**
   * _checkAfterReceiptTasksAndPublish
   *
   * @return {Promise<void>}
   * @private
   */
  async _checkAfterReceiptTasksAndPublish() {
    const oThis = this;

    let promises = [];

    for (let txHash in oThis.txHashPendingTxDataMap) {
      let ptd = oThis.txHashPendingTxDataMap[txHash];

      if (basicHelper.isEmptyObject(ptd)) {
        logger.debug('txHash not found in pending_tx', txHash);
        continue;
      }

      oThis.dataToDelete.push({
        transactionUuid: ptd.transactionUuid,
        chainId: oThis.chainId.toString()
      });

      if (ptd.hasOwnProperty('afterReceipt')) {
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

    return Promise.all(promises);
  }

  /**
   * Set notifier based on the kind
   *
   * @return {Promise<void>}
   * @private
   */
  async _setNotifier(rabbitmqKind) {
    const oThis = this;

    let rabbitKind = rabbitmqConstants.rabbitmqKinds[rabbitmqKind];

    oThis.ostNotification = await rabbitmqProvider.getInstance(rabbitKind, {
      chainId: oThis.chainId,
      connectionWaitSeconds: connectionTimeoutConst.crons,
      switchConnectionWaitSeconds: connectionTimeoutConst.switchConnectionCrons
    });

    if (!oThis.ostNotification) {
      return Promise.reject({ err: 'Could not create rabbit connection: ', rabbitmqKin: rabbitmqKind });
    }
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

    await oThis._setNotifier(messageParams.message.payload.rabbitmqKind);

    let setToRMQ = await oThis.ostNotification.publishEvent.perform(messageParams);

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
    const oThis = this;

    if (oThis.dataToDelete.length === 0) {
      return;
    }

    logger.info('==== _deleting PendingTransactions ===');
    logger.debug('oThis.dataToDelete', oThis.dataToDelete);

    let pendingTransactionModel = new oThis.PendingTransactionModel({
      chainId: oThis.chainId.toString()
    });

    let deleteRsp = await pendingTransactionModel.batchDeleteItem(
      oThis.dataToDelete,
      coreConstants.batchDeleteRetryCount
    );

    if (deleteRsp.isFailure()) {
      return deleteRsp;
    }

    let promises = [];

    for (let i = 0; i < oThis.dataToDelete.length; i++) {
      promises.push(pendingTransactionModel.clearCache(oThis.dataToDelete[i]));
    }

    await Promise.all(promises);
  }
}

module.exports = ProcessPendingTransaction;
