'use strict';

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  rabbitmqProvider = require(rootPrefix + '/lib/providers/rabbitmq'),
  rabbitmqConstants = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  connectionTimeoutConst = require(rootPrefix + '/lib/globalConstant/connectionTimeout'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner');

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
    oThis.forAuxChain = params.forAuxChain;
    oThis.transactionHashes = params.transactionHashes;
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

    await oThis._updateLastProcessedBlock();

    await oThis._publishBlock();
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

    let rabbitKind = oThis.forAuxChain ? '' : rabbitmqConstants.globalRabbitmqKind;

    // TODO: New connection every time?
    oThis.openSTNotification = await rabbitmqProvider.getInstance(rabbitKind, {
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

    let transactionHashes = oThis.transactionHashes;

    if (transactionHashes.length <= 0) return;

    oThis.dataToDelete = [];

    let promises = [];
    while (true) {
      let batchedTransactionHashes = transactionHashes.splice(0, 50);
      if (batchedTransactionHashes.length === 0) {
        break;
      }

      let pendingTransactionRsp = await new oThis.PendingTransactionByHashCache({
          chainId: oThis.chainId,
          transactionHashes: batchedTransactionHashes
        }).fetch(),
        pendingTransactionsMap = pendingTransactionRsp.data,
        transactionUuids = [];

      for (let txHash in pendingTransactionsMap) {
        let txData = pendingTransactionsMap[txHash];
        if (txData && txData.transactionUuid) {
          transactionUuids.push(txData.transactionUuid);
        }
      }
      if (transactionUuids.length <= 0) {
        continue;
      }

      let PendingTransactionByUuidCache = new oThis.PendingTransactionByUuidCache({
        chainId: oThis.chainId,
        transactionUuids: transactionUuids
      });

      let ptxResp = await PendingTransactionByUuidCache.fetch();

      if (ptxResp.isFailure() || ptxResp.data.length === 0) {
        continue;
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

  /**
   * updateLastProcessedBlock
   *
   * @return {Promise<void>}
   */
  async _updateLastProcessedBlock() {
    const oThis = this;

    let chainCronDataObj = new oThis.chainCronDataModel({});

    let updateParams = {
      chainId: oThis.chainId,
      lastFinalizedBlock: oThis.blockNumber
    };

    return chainCronDataObj.updateItem(updateParams);
  }

  /**
   * _publishBlock
   *
   * @return {Promise<void>}
   * @private
   */
  async _publishBlock() {
    const oThis = this;

    let messageParams = {
      topics: oThis._topicsToPublish,
      publisher: oThis._publisher,
      message: {
        kind: oThis._messageKind,
        payload: {
          chainId: oThis.chainId,
          blockNumber: oThis.blockNumber
        }
      }
    };

    let setToRMQ = await oThis.openSTNotification.publishEvent.perform(messageParams);

    // If could not set to RMQ run in async.
    if (setToRMQ.isFailure() || setToRMQ.data.publishedToRmq === 0) {
      logger.error("====Couldn't publish the message to RMQ====");
      return Promise.reject({ err: "Couldn't publish block number" + oThis.blockNumber });
    }
    logger.log('====published block', oThis.blockNumber);
  }

  /**
   * _topicsToPublish
   *
   * @return {*[]}
   * @private
   */
  get _topicsToPublish() {
    const oThis = this;

    return ['aggregator_' + oThis.chainId];
  }

  get _publisher() {
    const oThis = this;

    return 'OST';
  }

  get _messageKind() {
    const oThis = this;

    return 'background_job';
  }
}

module.exports = ProcessPendingTransaction;
