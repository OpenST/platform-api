/*
 * Module for finalizing the transaction and settling the balances.
 *
 * @module lib/transactions/finalizer/BalanceSettler.js
 */

const rootPrefix = '../../..',
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  NonceForSession = require(rootPrefix + '/lib/nonce/get/ForSession'),
  TransactionMeta = require(rootPrefix + '/app/models/mysql/TransactionMeta'),
  PendingTransactionCrud = require(rootPrefix + '/lib/transactions/PendingTransactionCrud'),
  PostTxFinalizeSteps = require(rootPrefix + '/lib/transactions/PostTransactionFinalizeSteps'),
  FetchPendingTxData = require(rootPrefix + '/lib/transactions/FetchPendingTransactionsByHash'),
  TransactionFinalizerTask = require(rootPrefix + '/app/models/mysql/TransactionFinalizerTask'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  rabbitmqProvider = require(rootPrefix + '/lib/providers/rabbitmq'),
  rabbitmqConstants = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  errorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  publishToPreProcessor = require(rootPrefix + '/lib/webhooks/publishToPreProcessor'),
  transactionMetaConst = require(rootPrefix + '/lib/globalConstant/transactionMeta'),
  connectionTimeoutConstants = require(rootPrefix + '/lib/globalConstant/connectionTimeout'),
  txFinalizerTaskConst = require(rootPrefix + '/lib/globalConstant/transactionFinalizerTask'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  webhookSubscriptionsConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

const BigNumber = require('bignumber.js'),
  BALANCE_SETTLE_BATCH_SZ = 15;

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chainMulti/BalanceShard');
require(rootPrefix + '/app/models/ddb/sharded/Balance');

/**
 * Class for finalizing the transaction and settling the balances.
 *
 * @class BalanceSettler
 */
class BalanceSettler {
  /**
   * Constructor for finalizing the transaction and settling the balances.
   *
   * @param {object} params
   * @param {number} params.taskId: transaction finalizer task id
   * @param {number} params.auxChainId: auxiliary chain id
   * @param {number} params.cronProcessId: cron process id
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.taskId = params.taskId;
    oThis.auxChainId = params.auxChainId;
    oThis.cronProcessId = params.cronProcessId;

    oThis.webhookPreprocessorPayloadsArray = [];
    oThis.rabbitMqConnection = null;
  }

  /**
   * Main performer for class.
   *
   * @return {Promise<>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(async function(error) {
      let customError;
      if (responseHelper.isCustomResult(error)) {
        customError = error;
      } else {
        logger.error(`${__filename} ::perform::catch`);
        logger.error(error);
        customError = responseHelper.error({
          internal_error_identifier: 'l_t_f_bs_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {
            error: error.toString()
          }
        });
      }
      customError.debugOptions.taskId = oThis.taskId;
      await createErrorLogsEntry.perform(customError, errorLogsConstants.highSeverity);

      return customError;
    });
  }

  /**
   * Async perform: perform transaction finalization.
   *
   * @return {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis._init();

    await oThis._fetchFromFinalizerTasks();

    await oThis._getPendingTxInfo();

    await oThis._getTransactionInfo();

    await oThis._getTransactionMetaInfo();

    await oThis._getTransferDetails();

    await oThis._updateStatusesInDb();

    await oThis._acquireLockOnTxMeta();

    await oThis._prepareLatestTransactionData();

    await oThis._publishLatestTransactions();

    await oThis._fetchLockAcquiredTransactions();

    await oThis._aggregateAmounts();

    await oThis._fetchBalanceShards();

    await oThis._settleBalances();

    await oThis._releaseLock();

    await oThis._postTxFinalizationSteps();

    await oThis._deleteTransactionFinalizerTask();

    await oThis._publishWebhookPreprocessorMessages();

    return responseHelper.successWithData({});
  }

  /**
   * Initialize.
   *
   * @return {Promise<void>}
   * @private
   */
  async _init() {
    const oThis = this;

    oThis._setLockId();

    oThis.blockScannerObj = await blockScannerProvider.getInstance([oThis.auxChainId]);
    oThis.balanceMap = {};
    oThis.erc20AddressesSet = new Set([]);
    oThis.transactionTransfersMap = {};
    oThis.failedTxMetaIdsMap = {};
    oThis.debugParams = {
      failedBalanceQueryLogs: [],
      failedPendingTxQueryLogs: []
    };
    oThis.transactionHashes = null;
    oThis.lockAcquiredTransactionHashes = [];
    oThis.txHashToTransactionDataMap = null;
    oThis.transactionMetaIds = [];
    oThis.lockedMetaIds = [];
    oThis.txHashToTxMetaDataMap = {};
  }

  /**
   * Fetch transaction hashes from transaction finalizer tasks.
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchFromFinalizerTasks() {
    const oThis = this;

    const transactionFinalizerTask = new TransactionFinalizerTask();

    const pendingTasks = await transactionFinalizerTask.fetchTask(oThis.taskId);

    const taskPendingStatus = txFinalizerTaskConst.invertedStatuses[txFinalizerTaskConst.pendingStatus];

    // TODO - atomic update and new status
    if (
      pendingTasks.length <= 0 ||
      !pendingTasks[0].transaction_hashes ||
      pendingTasks[0].status != taskPendingStatus
    ) {
      logger.error(
        'l_t_f_bs_1',
        'Task not found for balance settler.',
        'Could not fetch details for pending task: ',
        oThis.taskId
      );

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_t_f_bs_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            pendingTasks: pendingTasks
          }
        })
      );
    }

    oThis.transactionHashes = JSON.parse(pendingTasks[0].transaction_hashes);
  }

  /**
   * Get lock id.
   *
   * @sets oThis.lockId
   *
   * @private
   */
  _setLockId() {
    const oThis = this,
      currentTimeMs = new Date().getTime(),
      randomNumber = basicHelper.getRandomNumber(10000000000000, 99999999999999),
      // NOTE: as we have prefetch > 1 it is very IMPORTANT to add this random no. here
      // To avoid same lock id being used for multiple queries
      lockIdPrefix = currentTimeMs + randomNumber;

    oThis.lockId = parseFloat(lockIdPrefix + '.' + oThis.cronProcessId);
  }

  /**
   * Update statuses in DB.
   * 1. If entry not present in tx meta and if transfer event present, then create entry in tx meta
   * 2. If entry present in pending, then update block number, status, timestamp
   * 3. If entry not found with tx hash in pending but found in meta, then update
   * 4. Clear session nonce cache if needed
   *
   * @returns {Promise<void>}
   * @private
   */
  async _updateStatusesInDb() {
    const oThis = this;

    const promises = [],
      receiptSuccessTxHashes = [],
      receiptFailureTxHashes = [],
      flushNonceCacheForSessionAddresses = [];

    for (let index = 0; index < oThis.transactionHashes.length; index++) {
      const txHash = oThis.transactionHashes[index],
        txData = oThis.txHashToTransactionDataMap[txHash],
        transactionStatus = parseInt(txData.transactionStatus),
        transactionInternalStatus = parseInt(txData.transactionInternalStatus),
        txMetaData = oThis.txHashToTxMetaDataMap[txHash],
        txMetaReceiptStatusStr = transactionStatus
          ? transactionMetaConst.successReceiptStatus
          : transactionMetaConst.failureReceiptStatus,
        txMetaReceiptStatusInt = transactionMetaConst.invertedReceiptStatuses[txMetaReceiptStatusStr];

      let txMissingInPendingTx = false,
        pendingTxData = oThis.txHashPendingTxDataMap[txHash];

      if (txMetaData) {
        if (txMetaData.receiptStatus != txMetaReceiptStatusInt) {
          if (transactionStatus) {
            receiptSuccessTxHashes.push(txHash);
          } else {
            receiptFailureTxHashes.push(txHash);
          }
        }
      } else if (CommonValidators.validateObject(oThis.transactionTransfersMap[txHash])) {
        // If tx meta was not present we would create ONLY if there were transfer events in the receipt
        const promise = new TransactionMeta()
          .insert({
            transaction_uuid: txData.transactionUuid,
            transaction_hash: txHash,
            associated_aux_chain_id: oThis.auxChainId,
            status: transactionMetaConst.invertedStatuses[transactionMetaConst.minedStatus],
            receipt_status: txMetaReceiptStatusInt,
            kind: transactionMetaConst.invertedKinds[transactionMetaConst.externalExecution]
          })
          .fire()
          .then(function(insertRsp) {
            // Append this data in oThis.txHashToTxMetaDataMap for later usage
            oThis.txHashToTxMetaDataMap[txHash] = {
              status: transactionMetaConst.invertedStatuses[transactionMetaConst.minedStatus],
              receiptStatus: txMetaReceiptStatusInt,
              transactionUuid: txData.transaction_uuid,
              id: insertRsp.insertId
            };
            oThis.transactionMetaIds.push(insertRsp.insertId);
          })
          .catch(function(txMetaInsertError) {
            logger.error('txMetaInsertError', txMetaInsertError);
            // This catch to avoid duplicate errors before lock acquiring.
          });

        promises.push(promise);
      }

      // If pending tx record not found but txHash was present in tx_meta
      // We need to update tx_hash in pending_tx
      // Initialize pendingTxData here and update query is handled below
      if (!CommonValidators.validateObject(pendingTxData) && txMetaData) {
        txMissingInPendingTx = true;
        pendingTxData = {
          transactionUuid: txMetaData.transactionUuid
        };
      }

      // As there still may be cases where for some tx we don't have pendingTxData.
      if (CommonValidators.validateObject(pendingTxData)) {
        let pendingTxStatus;
        if (transactionStatus & transactionInternalStatus) {
          pendingTxStatus = pendingTransactionConstants.successStatus;
        } else {
          pendingTxStatus = pendingTransactionConstants.failedStatus;
        }

        if (txMetaData && txMetaData.tokenId) {
          // Send webhookPreprocessor payload.
          const webhookPreprocessorPayload = oThis.webhookPreprocessorPayload(
            pendingTxData.transactionUuid,
            txMetaData.tokenId,
            pendingTxStatus
          );

          oThis.webhookPreprocessorPayloadsArray.push(webhookPreprocessorPayload);
        }

        logger.log('pendingTxData.status ====', pendingTxData.status, 'pendingTxStatus ======', pendingTxStatus);

        if (
          pendingTxData.status !== pendingTxStatus ||
          pendingTxData.blockTimestamp !== txData.blockTimestamp ||
          pendingTxData.blockNumber !== txData.blockNumber
        ) {
          const updateQueryParams = {
            transactionUuid: pendingTxData.transactionUuid,
            status: pendingTxStatus,
            blockTimestamp: txData.blockTimestamp,
            blockNumber: txData.blockNumber,
            transactionHash: txHash
          };

          const promise = new PendingTransactionCrud(oThis.auxChainId)
            .update(updateQueryParams)
            .then(function(updatePendingTxRsp) {
              if (updatePendingTxRsp.isFailure()) {
                return Promise.reject(updatePendingTxRsp);
              }

              // Reload the data in memory with ALL_NEW returned from query response
              oThis.txHashPendingTxDataMap[txHash] = updatePendingTxRsp.data;
            })
            .catch(function(updatePendingTxError) {
              if (txMissingInPendingTx) {
                // TxHash was to be updated in pending_tx here. It failed thus we do not know of the pessimistic debits
                // Fail balance settlement for this
                oThis.failedTxMetaIdsMap[txMetaData.id] = 1;
                let updateQueryRsp;
                if (responseHelper.isCustomResult(updatePendingTxError)) {
                  updateQueryRsp = updatePendingTxError.toHash();
                } else {
                  updateQueryRsp = updatePendingTxError.toString();
                }
                oThis.debugParams.failedPendingTxQueryLogs.push({
                  updateQueryParams: updateQueryParams,
                  updateQueryRsp: updateQueryRsp
                });
              } else {
                // Do nothing as pending would be anyways deleted soon
                // Downside here is that ES status remains as submitted.
              }
            });

          promises.push(promise);
        }
      }
    }

    await Promise.all(promises);

    // New loop since we need updated value for oThis.txHashPendingTxDataMap
    for (let index = 0; index < oThis.transactionHashes.length; index++) {
      const txHash = oThis.transactionHashes[index],
        txData = oThis.txHashToTransactionDataMap[txHash],
        transactionStatus = parseInt(txData.transactionStatus),
        pendingTxData = oThis.txHashPendingTxDataMap[txHash];

      if (!CommonValidators.validateObject(pendingTxData)) {
        continue;
      }

      if (!transactionStatus && pendingTxData.sessionKeyAddress) {
        flushNonceCacheForSessionAddresses.push(pendingTxData.sessionKeyAddress);
      }

      if (pendingTxData.erc20Address) {
        oThis.erc20AddressesSet.add(pendingTxData.erc20Address);
      }
    }

    if (receiptSuccessTxHashes.length > 0) {
      await new TransactionMeta().updateRecordsWithoutReleasingLock({
        status: transactionMetaConst.minedStatus,
        receiptStatus: transactionMetaConst.successReceiptStatus,
        transactionHashes: receiptSuccessTxHashes,
        chainId: oThis.auxChainId
      });
    }

    if (receiptFailureTxHashes.length > 0) {
      await new TransactionMeta().updateRecordsWithoutReleasingLock({
        status: transactionMetaConst.minedStatus,
        receiptStatus: transactionMetaConst.failureReceiptStatus,
        transactionHashes: receiptFailureTxHashes,
        chainId: oThis.auxChainId
      });
    }

    if (flushNonceCacheForSessionAddresses.length > 0) {
      await oThis._flushNonceCacheForSessionAddresses(flushNonceCacheForSessionAddresses);
    }
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
        publishToPreProcessor.perform(oThis.auxChainId, oThis.webhookPreprocessorPayloadsArray[index])
      );
    }

    await Promise.all(preprocessorPublishPromisesArray);
  }

  /**
   * Flush nonce cache for session addresses.
   *
   * @param {array<string>} addresses
   *
   * @returns {Promise<*>}
   * @private
   */
  async _flushNonceCacheForSessionAddresses(addresses) {
    const oThis = this;

    const promises = [];

    for (let index = 0; index < addresses.length; index++) {
      promises.push(
        new NonceForSession({
          address: addresses[index],
          chainId: oThis.auxChainId
        }).clear()
      );
    }

    await Promise.all(promises);
  }

  /**
   * Acquire lock on transaction meta.
   *
   * @return {Promise<void>}
   * @private
   */
  async _acquireLockOnTxMeta() {
    const oThis = this;

    if (oThis.transactionMetaIds.length > 0) {
      await new TransactionMeta()
        .update({
          lock_id: oThis.lockId,
          status: transactionMetaConst.invertedStatuses[transactionMetaConst.finalizationInProcess]
        })
        .where(['id IN (?) AND lock_id IS NULL', oThis.transactionMetaIds]) // Adding lock_id IS NULL to be extra safe, minedStatus should be enough ?
        .fire();
    }
  }

  /**
   * Fetch locked transactions from transaction meta
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchLockAcquiredTransactions() {
    const oThis = this,
      transactionMeta = new TransactionMeta();

    const dbRows = await transactionMeta.fetchByLockId(oThis.lockId);

    for (let index = 0; index < dbRows.length; index++) {
      const dbRow = dbRows[index];

      oThis.lockedMetaIds.push(dbRow.id);
      oThis.lockAcquiredTransactionHashes.push(dbRow.transaction_hash);
    }

    logger.debug('===oThis.lockAcquiredTransactionHashes', oThis.lockAcquiredTransactionHashes);

    // If lock acquired transactions meta is different then lock required on
    if (oThis.lockedMetaIds.length !== oThis.transactionMetaIds.length) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_t_f_bs_6',
          api_error_identifier: 'something_went_wrong',
          debug_options: { err: 'Not able to acquire lock on all transaction meta rows.' }
        })
      );
    }
  }

  /**
   * Get pending transactions
   *
   * @return {Promise<void>}
   * @private
   */
  async _getPendingTxInfo() {
    const oThis = this,
      fetchPendingTxData = new FetchPendingTxData(oThis.auxChainId, oThis.transactionHashes);

    // Don't remove the catch.
    const ptxResp = await fetchPendingTxData.perform().catch(function(err) {
      logger.error(err);

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_t_f_bs_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: { err: err.toString() }
        })
      );
    });

    if (ptxResp.isFailure()) {
      return Promise.reject(ptxResp);
    }

    oThis.txHashPendingTxDataMap = ptxResp.data;

    logger.debug('====oThis.txHashPendingTxDataMap', oThis.txHashPendingTxDataMap);
  }

  /**
   * Fetch tx meta data.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _getTransactionMetaInfo() {
    const oThis = this;

    const dbRows = await new TransactionMeta().fetchByTransactionHashes(oThis.auxChainId, oThis.transactionHashes);

    for (let index = 0; index < dbRows.length; index++) {
      const dbRow = dbRows[index];

      // Check for status of transactions in table
      if (transactionMetaConst.invertedStatuses[transactionMetaConst.minedStatus] != dbRow.status) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'l_t_f_bs_5',
            api_error_identifier: 'something_went_wrong',
            debug_options: { err: 'Transaction meta status is not mined, for certain transactions.' }
          })
        );
      }

      oThis.txHashToTxMetaDataMap[dbRow.transaction_hash] = {
        status: dbRow.status,
        receiptStatus: dbRow.receipt_status,
        tokenId: dbRow.token_id,
        transactionUuid: dbRow.transaction_uuid,
        id: dbRow.id
      };

      oThis.transactionMetaIds.push(dbRow.id);
    }

    logger.debug('====oThis.txHashToTxMetaDataMap', oThis.txHashToTxMetaDataMap);
  }

  /**
   * Get transactions info.
   *
   * @sets oThis.txHashToTransactionDataMap
   *
   * @returns {Promise<Promise<never>|undefined>}
   * @private
   */
  async _getTransactionInfo() {
    const oThis = this,
      TransactionGet = oThis.blockScannerObj.transaction.Get;

    const transactionGet = new TransactionGet(oThis.auxChainId, oThis.transactionHashes);

    const txGetRsp = await transactionGet.perform();

    if (txGetRsp.isFailure()) {
      return Promise.reject(txGetRsp);
    }

    oThis.txHashToTransactionDataMap = txGetRsp.data;

    logger.debug('===oThis.txHashToTransactionDataMap==', oThis.txHashToTransactionDataMap);

    // Transactions whose balance needs to be settled should be present in ddb transactions
    if (oThis.transactionHashes.length !== Object.keys(oThis.txHashToTransactionDataMap).length) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_t_f_bs_4',
          api_error_identifier: 'something_went_wrong',
          debug_options: { err: 'Ddb transactions not found for all transaction hahes.' }
        })
      );
    }
  }

  /**
   * This function prepares transaction data to be published in latest transaction queue
   *
   * @returns {Promise<void>}
   * @private
   */
  async _prepareLatestTransactionData() {
    const oThis = this;

    //From oThis.transactionTransfersMap select all hashes and get its required data from txHashToTransactionDataMap
    //gas price , gas limit
    oThis.txHashToLatestTxDataMap = {};

    for (let transactionHash in oThis.transactionTransfersMap) {
      oThis.txHashToLatestTxDataMap[transactionHash] = {};
      oThis.txHashToLatestTxDataMap[transactionHash].gasPrice =
        oThis.txHashToTransactionDataMap[transactionHash].gasPrice;
      oThis.txHashToLatestTxDataMap[transactionHash].gasUsed =
        oThis.txHashToTransactionDataMap[transactionHash].gasUsed;
      oThis.txHashToLatestTxDataMap[transactionHash].tokenId = oThis.txHashToTxMetaDataMap[transactionHash].tokenId;
      oThis.txHashToLatestTxDataMap[transactionHash].blockTimestamp =
        oThis.txHashToTransactionDataMap[transactionHash].blockTimestamp;
      oThis.txHashToLatestTxDataMap[transactionHash].amount =
        oThis.transactionTransfersMap[transactionHash]['1'].amount;
      oThis.txHashToLatestTxDataMap[transactionHash].chainId = oThis.auxChainId;
    }

    console.log('---txHashToLatestTxDataMap---', oThis.txHashToLatestTxDataMap);
  }

  async _publishLatestTransactions() {
    const oThis = this;

    if (Object.keys(oThis.txHashToLatestTxDataMap).length === 0) {
      return;
    }

    if (!oThis.rabbitMqConnection) {
      oThis.rabbitMqConnection = await rabbitmqProvider.getInstance(rabbitmqConstants.globalRabbitmqKind, {
        auxChainId: oThis.auxChainId,
        connectionWaitSeconds: connectionTimeoutConstants.crons,
        switchConnectionWaitSeconds: connectionTimeoutConstants.switchConnectionCrons
      });
    }

    const messageParams = {
      topics: oThis._topicsToPublish,
      publisher: oThis._publisher,
      message: {
        kind: oThis._messageKind,
        payload: JSON.stringify(oThis.txHashToLatestTxDataMap)
      }
    };

    const setToRMQ = await oThis.rabbitMqConnection.publishEvent.perform(messageParams);

    if (setToRMQ.isFailure() || setToRMQ.data.publishedToRmq === 0) {
      await oThis._handleLatestTxPublishError(messageParams);
    }
  }

  async _handleLatestTxPublishError(messageParams) {
    logger.error('Could not publish the message to RMQ.');
    const oThis = this;

    const errorObject = responseHelper.error({
      internal_error_identifier: 'latest_transaction_publish_failed:l_t_f_bs_10',
      api_error_identifier: 'something_went_wrong',
      debug_options: { messageParams: messageParams.message }
    });

    await createErrorLogsEntry.perform(errorObject, errorLogsConstants.mediumSeverity);

    return errorObject;
  }

  /**
   * Topics to publish.
   *
   * @return {*[]}
   *
   * @private
   */
  get _topicsToPublish() {
    const oThis = this;

    return ['latest_transaction'];
  }

  /**
   * Publisher.
   *
   * @return {String}
   *
   * @private
   */
  get _publisher() {
    return 'OST';
  }

  /**
   * Message kind.
   *
   * @return {String}
   *
   * @private
   */
  get _messageKind() {
    return 'background_job';
  }

  /**
   * Get transfer details for the given transaction hashes.
   *
   * @sets oThis.transactionTransfersMap
   *
   * @return {Promise<void>}
   * @private
   */
  async _getTransferDetails() {
    const oThis = this,
      GetTransfer = oThis.blockScannerObj.transfer.GetAll,
      getTransfer = new GetTransfer(oThis.auxChainId, oThis.transactionHashes),
      getTransferResp = await getTransfer.perform();

    if (getTransferResp.isFailure()) {
      return Promise.reject(getTransferResp);
    }

    oThis.transactionTransfersMap = getTransferResp.data;

    logger.debug('==oThis.transactionTransfersMap', oThis.transactionTransfersMap);
  }

  /**
   * Aggregate amounts based on hash
   *
   * @private
   */
  _aggregateAmounts() {
    const oThis = this;

    oThis._aggregatePendingTransactions();
    oThis._aggregateTransfers();

    logger.debug('====oThis.balanceMap', oThis.balanceMap);
  }

  /**
   * Aggregate pending transaction data
   *
   * @return {*|result}
   * @private
   */
  _aggregatePendingTransactions() {
    const oThis = this,
      negativeMultiplier = new BigNumber(-1);

    for (let index = 0; index < oThis.lockAcquiredTransactionHashes.length; index++) {
      const txHash = oThis.lockAcquiredTransactionHashes[index],
        txMetaData = oThis.txHashToTxMetaDataMap[txHash],
        pendingTransaction = oThis.txHashPendingTxDataMap[txHash];

      if (!CommonValidators.validateObject(pendingTransaction) || oThis.failedTxMetaIdsMap[txMetaData.id]) {
        // As we would not settle balances till record was found in pending_tx & tx_meta or if failedTxMetaIdsMap had it
        continue;
      }

      const unsettledDebits = pendingTransaction.unsettledDebits;

      if (!unsettledDebits) {
        continue;
      }

      for (let unsettledDebitsIndex = 0; unsettledDebitsIndex < unsettledDebits.length; unsettledDebitsIndex++) {
        const unsettledDebit = unsettledDebits[unsettledDebitsIndex],
          balanceKey = oThis._createKey(unsettledDebit.erc20Address, unsettledDebit.tokenHolderAddress),
          blockChainUnsettledDebitsBn = new BigNumber(unsettledDebit.blockChainUnsettleDebits),
          negativeBlockChainUnsettledDebitsBn = blockChainUnsettledDebitsBn.mul(negativeMultiplier),
          txMetaDataFromPendingTransactionHash = oThis.txHashToTxMetaDataMap[pendingTransaction.transactionHash],
          txMetaId = txMetaDataFromPendingTransactionHash.id;

        if (oThis.balanceMap.hasOwnProperty(balanceKey)) {
          const buffer = oThis.balanceMap[balanceKey];

          buffer.affectedTxMetaIds.push(txMetaId);
          buffer.blockChainUnsettleDebits = buffer.blockChainUnsettleDebits.add(negativeBlockChainUnsettledDebitsBn);
        } else {
          oThis.balanceMap[balanceKey] = {
            blockChainUnsettleDebits: negativeBlockChainUnsettledDebitsBn,
            affectedTxMetaIds: [txMetaId]
          };
        }
      }
    }
  }

  /**
   * Aggregate transfers from chain
   *
   * @private
   */
  _aggregateTransfers() {
    const oThis = this;

    for (let index = 0; index < oThis.lockAcquiredTransactionHashes.length; index++) {
      const txHash = oThis.lockAcquiredTransactionHashes[index],
        transfersInfo = oThis.transactionTransfersMap[txHash],
        txMetaData = oThis.txHashToTxMetaDataMap[txHash],
        txMetaId = txMetaData.id,
        negativeMultiplier = new BigNumber(-1);

      if (oThis.failedTxMetaIdsMap[txMetaId]) {
        // If failedTxMetaIdsMap has it, ignore this tx
        continue;
      }

      for (const transferIndex in transfersInfo) {
        const transferInfo = transfersInfo[transferIndex],
          fromAddress = transferInfo.fromAddress,
          erc20Address = transferInfo.contractAddress,
          toAddress = transferInfo.toAddress,
          amountBn = new BigNumber(transferInfo.amount),
          negativeAmountBn = amountBn.mul(negativeMultiplier),
          pendingTransaction = oThis.txHashPendingTxDataMap[txHash];

        if (!CommonValidators.validateObject(pendingTransaction)) {
          // As we would not settle balances till record was found in pending_tx & tx_meta
          continue;
        }

        oThis.erc20AddressesSet.add(erc20Address);

        // Handling for fromAddress
        if (!CommonValidators.validateZeroEthAddress(fromAddress)) {
          const fromBalanceKey = oThis._createKey(erc20Address, fromAddress);
          if (oThis.balanceMap.hasOwnProperty(fromBalanceKey)) {
            const buffer = oThis.balanceMap[fromBalanceKey];
            buffer.affectedTxMetaIds.push(txMetaId);
            if (!buffer.hasOwnProperty('blockChainSettledBalance')) {
              buffer.blockChainSettledBalance = new BigNumber('0');
            }
            buffer.blockChainSettledBalance = buffer.blockChainSettledBalance.add(negativeAmountBn);
          } else {
            oThis.balanceMap[fromBalanceKey] = {
              blockChainSettledBalance: negativeAmountBn,
              affectedTxMetaIds: [txMetaId]
            };
          }
        }

        // Handling for toAddress.
        if (!CommonValidators.validateZeroEthAddress(toAddress)) {
          const toBalanceKey = oThis._createKey(erc20Address, toAddress);
          if (oThis.balanceMap.hasOwnProperty(toBalanceKey)) {
            const buffer = oThis.balanceMap[toBalanceKey];

            buffer.affectedTxMetaIds.push(txMetaId);
            if (!buffer.hasOwnProperty('blockChainSettledBalance')) {
              buffer.blockChainSettledBalance = new BigNumber('0');
            }
            buffer.blockChainSettledBalance = buffer.blockChainSettledBalance.add(amountBn);
          } else {
            oThis.balanceMap[toBalanceKey] = {
              blockChainSettledBalance: amountBn,
              affectedTxMetaIds: [txMetaId]
            };
          }
        }
      }
    }
  }

  /**
   * Fetch balance shards for the erc20Addresses.
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchBalanceShards() {
    const oThis = this,
      BalanceShardCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BalanceShardCache');

    const erc20Addresses = Array.from(oThis.erc20AddressesSet);

    logger.debug('erc20Addresses', erc20Addresses);

    if (erc20Addresses.length === 0) {
      return;
    }

    const balanceShardCacheObj = new BalanceShardCache({
      erc20Addresses: erc20Addresses,
      chainId: oThis.auxChainId
    });

    const response = await balanceShardCacheObj.fetch().catch(function(err) {
      logger.error('could not fetch balance shards', err);

      return responseHelper.error({
        internal_error_identifier: 'l_t_f_bs_4',
        api_error_identifier: 'something_went_wrong',
        debug_options: { err: err.toString() }
      });
    });

    if (response.isFailure()) {
      await oThis._markCompleteBatchAsFailed(response);

      return Promise.reject(response);
    }

    oThis.balanceShardMap = response.data;

    logger.debug('===oThis.balanceShardMap', oThis.balanceShardMap);
  }

  /**
   * Settle balances
   *
   * @return {Promise<void>}
   * @private
   */
  async _settleBalances() {
    const oThis = this,
      BalanceModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BalanceModel');

    let promiseArray = [],
      batchSize = 0;

    for (const key in oThis.balanceMap) {
      const balanceSettlementData = oThis.balanceMap[key],
        resultAddresses = oThis._splitKey(key),
        erc20Address = resultAddresses[0],
        tokenHolderAddress = resultAddresses[1],
        shardNumber = oThis.balanceShardMap[erc20Address];

      if (basicHelper.isEmptyObject(shardNumber)) {
        logger.log('ignoring settling balance for unrecognized contract: ', erc20Address);
        continue;
      }

      const balanceModelObj = new BalanceModel({ shardNumber: shardNumber }),
        updateQueryParams = {
          tokenHolderAddress: tokenHolderAddress,
          erc20Address: erc20Address
        };

      if (balanceSettlementData.hasOwnProperty('blockChainUnsettleDebits')) {
        updateQueryParams.blockChainUnsettleDebits = basicHelper.formatWeiToString(
          balanceSettlementData.blockChainUnsettleDebits
        );
      }
      if (balanceSettlementData.hasOwnProperty('blockChainSettledBalance')) {
        updateQueryParams.blockChainSettledBalance = basicHelper.formatWeiToString(
          balanceSettlementData.blockChainSettledBalance
        );
      }

      promiseArray.push(
        balanceModelObj.updateBalance(updateQueryParams).catch(function(err) {
          logger.error('Balance Settlement Error from BalanceSettler', err);
          for (let index = 0; index < balanceSettlementData.affectedTxMetaIds.length; index++) {
            oThis.failedTxMetaIdsMap[balanceSettlementData.affectedTxMetaIds[index]] = 1;
          }
          oThis.debugParams.failedBalanceQueryLogs.push({
            updateQueryParams: updateQueryParams,
            updateQueryRsp: err.toHash(),
            affectedTxMetaIds: balanceSettlementData.affectedTxMetaIds
          });
        })
      );

      batchSize += 1;

      if (batchSize === BALANCE_SETTLE_BATCH_SZ) {
        await Promise.all(promiseArray);
        promiseArray = [];
        batchSize = 0;
      }
    }

    if (batchSize > 0) {
      await Promise.all(promiseArray);
    }
  }

  /**
   * Create key.
   *
   * @param {string} erc20Address
   * @param {string} tokenHolderAddress
   *
   * @private
   */
  _createKey(erc20Address, tokenHolderAddress) {
    return `${erc20Address}-${tokenHolderAddress}`;
  }

  /**
   * Split key
   *
   * @param {string} key
   *
   * @private
   */
  _splitKey(key) {
    const splitKey = key.split('-'),
      erc20Address = splitKey[0],
      tokenHolderAddress = splitKey[1];

    return [erc20Address, tokenHolderAddress];
  }

  /**
   * Release lock on transactions and mark success
   *
   * @return {Promise<void>}
   * @private
   */
  async _releaseLock() {
    const oThis = this;

    const failedTxMetaIds = Object.keys(oThis.failedTxMetaIdsMap);

    if (failedTxMetaIds.length > 0) {
      await new TransactionMeta().updateRecordsByReleasingLock({
        status: transactionMetaConst.finalizationFailed,
        ids: failedTxMetaIds
      });
    }

    const failedIdsMap = {};
    for (let index = 0; index < failedTxMetaIds.length; index++) {
      failedIdsMap[failedTxMetaIds[index]] = 1;
    }

    const successIds = [];
    for (let index = 0; index < oThis.transactionMetaIds.length; index++) {
      const id = oThis.transactionMetaIds[index];
      if (!failedIdsMap[id]) {
        successIds.push(id);
      }
    }

    if (successIds.length > 0) {
      await new TransactionMeta().updateRecordsByReleasingLock({
        status: transactionMetaConst.finalizedStatus,
        ids: successIds
      });
    }
  }

  /**
   * Perform deletion and after receipt publish of pending transactions
   *
   * @return {Promise<void>}
   * @private
   */
  async _postTxFinalizationSteps() {
    const oThis = this;

    const postTxFinalizeSteps = new PostTxFinalizeSteps({
      chainId: oThis.auxChainId,
      blockNumber: oThis.blockNumber,
      transactionHashes: oThis.transactionHashes,
      txHashPendingTxDataMap: oThis.txHashPendingTxDataMap
    });

    return await postTxFinalizeSteps.perform();
  }

  /**
   * Release lock by lock id in case where we need to mark complete batch as failed
   *
   * @return {Promise<void>}
   * @private
   */
  async _markCompleteBatchAsFailed(errorResponse) {
    const oThis = this,
      transactionFinalizerTask = new TransactionFinalizerTask();

    await new TransactionMeta().updateRecordsByReleasingLock({
      status: transactionMetaConst.finalizationFailed,
      lockId: oThis.lockId
    });

    await transactionFinalizerTask
      .update({
        debug_params: JSON.stringify(errorResponse.toHash())
      })
      .where({ id: oThis.taskId })
      .fire();
  }

  /**
   * Delete task entry from transaction finalizer tasks
   *
   * @return {Promise<void>}
   * @private
   */
  async _deleteTransactionFinalizerTask() {
    const oThis = this,
      transactionFinalizerTask = new TransactionFinalizerTask();
    if (!CommonValidators.validateObject(oThis.failedTxMetaIdsMap)) {
      // If failedTxMetaIdsMap is empty.
      return transactionFinalizerTask.deleteTask(oThis.taskId);
    }
    oThis.debugParams.failedTxMetaIdsMap = oThis.failedTxMetaIdsMap;

    return transactionFinalizerTask
      .update({
        debug_params: JSON.stringify(oThis.debugParams)
      })
      .where({ id: oThis.taskId })
      .fire();
  }

  /**
   * Create payload for webhook Preprocessor queue.
   *
   * @param {string} transactionUuid
   * @param {string} tokenId
   * @param {string} status
   *
   * @returns {{webhookKind: string, transactionUuid: string, tokenId: string}}
   */
  webhookPreprocessorPayload(transactionUuid, tokenId, status) {
    return {
      webhookKind:
        status === pendingTransactionConstants.successStatus
          ? webhookSubscriptionsConstants.transactionsSuccessTopic
          : webhookSubscriptionsConstants.transactionsFailureTopic,
      tokenId: tokenId,
      transactionUuid: transactionUuid
    };
  }
}

InstanceComposer.registerAsShadowableClass(BalanceSettler, coreConstants.icNameSpace, 'BalanceSettler');

module.exports = {};
