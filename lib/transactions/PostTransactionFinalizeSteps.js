'use strict';

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  rabbitmqProvider = require(rootPrefix + '/lib/providers/rabbitmq'),
  rabbitmqConstant = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  connectionTimeoutConst = require(rootPrefix + '/lib/globalConstant/connectionTimeout'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  ErrorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  RedemptionTxFinalized = require(rootPrefix + '/lib/redemption/userRequests/TransactionFinalized'),
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
    oThis.transactionTransfersMap = params.transactionTransfersMap;

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
      return responseHelper.successWithData({});
    }

    await oThis._init();

    await oThis._fetchPendingTransactionData();

    await oThis._finalizeRedemptionRequests();

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
   * Accept User Redemptions requests if any
   *
   * @returns {Promise<void>}
   * @private
   */
  async _finalizeRedemptionRequests() {
    const oThis = this;

    let userRedemptionIds = [],
      transactionInfoMap = {};
    for (let txHash in oThis.txHashPendingTxDataMap) {
      let ptd = oThis.txHashPendingTxDataMap[txHash];

      if (ptd.hasOwnProperty('redemptionDetails') && ptd.redemptionDetails) {
        let txStatus = ptd.status,
          userTokenHolderAddr = null;

        if (txStatus == pendingTransactionConstants.successStatus) {
          // As only one transfer is allowed for redemption transaction, so using event index as 1 to fetch data
          const eventIndex = '1';
          userTokenHolderAddr = oThis.transactionTransfersMap[txHash][eventIndex].fromAddress;
        }

        userRedemptionIds.push(ptd.redemptionDetails.redemptionId);
        transactionInfoMap[ptd.redemptionDetails.redemptionId] = {
          transactionHash: txHash,
          userTokenHolder: userTokenHolderAddr,
          transactionStatus: txStatus
        };
      }
    }

    // If there are any redemption requests in finalized transactions
    if (userRedemptionIds.length > 0) {
      await new RedemptionTxFinalized({
        chainId: oThis.chainId,
        userRedemptionUuids: userRedemptionIds,
        transactionInfoMap: transactionInfoMap
      }).perform();
    }
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
        logger.info(' =========== txHash not found in pending_tx', txHash);
        continue;
      }

      if (ptd.hasOwnProperty('afterReceipt')) {
        let publishPromise = new Promise(function(onResolve, onReject) {
          oThis
            ._publishAfterReceiptInfo(ptd.afterReceipt)
            .then(function(resp) {
              oThis.dataToDelete.push({
                transactionUuid: ptd.transactionUuid,
                chainId: oThis.chainId.toString()
              });
              onResolve();
            })
            .catch(async function(err) {
              logger.error('Could not publish transaction after receipt: ', err);
              const errorObject = responseHelper.error({
                internal_error_identifier: 'rmq_publish_failed:l_t_ptfs_1',
                api_error_identifier: 'rmq_publish_failed',
                debug_options: { transactionUuid: ptd.transactionUuid, transactionHash: ptd.transactionHash }
              });

              await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);
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
  async _getNotifier(rabbitmqKind) {
    const oThis = this;

    let rabbitParams = {
      connectionWaitSeconds: connectionTimeoutConst.crons,
      switchConnectionWaitSeconds: connectionTimeoutConst.switchConnectionCrons
    };

    if (rabbitmqKind === rabbitmqConstant.auxRabbitmqKind) {
      rabbitParams['auxChainId'] = oThis.chainId;
    } else {
      rabbitParams['chainId'] = oThis.chainId;
    }

    const ostNotification = await rabbitmqProvider.getInstance(rabbitmqKind, rabbitParams);

    if (!ostNotification) {
      logger.error('==== Could not create rabbit connection: ==== rabbitmqKind: ', rabbitmqKind);
      return Promise.reject({ err: 'Could not create rabbit connection: ', rabbitmqKind: rabbitmqKind });
    }

    return ostNotification;
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

    if (!publishParams || publishParams === '') {
      return responseHelper.successWithData({});
    }

    let messageParams = JSON.parse(publishParams);

    const ostNotification = await oThis._getNotifier(messageParams.message.payload.rabbitmqKind);

    let setToRMQ = await ostNotification.publishEvent.perform(messageParams);

    // If could not set to RMQ run in async.
    if (setToRMQ.isFailure() || setToRMQ.data.publishedToRmq === 0) {
      logger.error("====Couldn't publish the message to RMQ==== publishParams: ", publishParams);
      return Promise.reject({ err: "Couldn't publish transaction pending for publish: " + publishParams });
    }

    logger.info('==== Pending transaction published === publishParams: ', publishParams);
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
