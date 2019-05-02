'use strict';
/*
 * Class file for finalizing the transaction and settling the balances
 *
 * @module lib/transactions/finalizer/BalanceSettler.js
 */

const rootPrefix = '../../..',
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  txFinalizerTaskConst = require(rootPrefix + '/lib/globalConstant/transactionFinalizerTask'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  transactionMetaConst = require(rootPrefix + '/lib/globalConstant/transactionMeta'),
  PendingTransactionCrud = require(rootPrefix + '/lib/transactions/PendingTransactionCrud'),
  TransactionMeta = require(rootPrefix + '/app/models/mysql/TransactionMeta'),
  FetchPendingTxData = require(rootPrefix + '/lib/transactions/FetchPendingTransactionsByHash'),
  PostTxFinalizeSteps = require(rootPrefix + '/lib/transactions/PostTransactionFinalizeSteps'),
  NonceForSession = require(rootPrefix + '/lib/nonce/get/ForSession'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  ErrorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  TransactionFinalizerTask = require(rootPrefix + '/app/models/mysql/TransactionFinalizerTask');

const BigNumber = require('bignumber.js'),
  BALANCE_SETTLE_BATCH_SZ = 15;

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/lib/cacheManagement/chainMulti/BalanceShard');
require(rootPrefix + '/app/models/ddb/sharded/Balance');

class BalanceSettler {
  /**
   * @constructor
   *
   * @param params
   * @param params.taskId              {Number} - transaction finalizer task id
   * @param params.auxChainId          {Number} - auxiliary chain id
   * @param params.cronProcessId       {Number} - cron process id
   */
  constructor(params) {
    const oThis = this;

    oThis.taskId = params.taskId;
    oThis.auxChainId = params.auxChainId;
    oThis.cronProcessId = params.cronProcessId;
  }

  /**
   * Performer
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
      customError.debugOptions['taskId'] = oThis.taskId;
      await createErrorLogsEntry.perform(customError, ErrorLogsConstants.mediumSeverity);
      return customError;
    });
  }

  /**
   * Perform transaction finalization
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

    await oThis._fetchLockAcquiredTransactions();

    if (oThis.lockAcquiredTransactionHashes.length === 0) {
      return await oThis._postTxFinalizationSteps();
    }

    await oThis._aggregateAmounts();

    await oThis._fetchBalanceShards();

    await oThis._settleBalances();

    await oThis._releaseLock();

    await oThis._postTxFinalizationSteps();

    await oThis._deleteTransactionFinalizerTask();

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
    oThis.lockedMetaIds = [];
    oThis.txHashToTxMetaDataMap = {};
  }

  /**
   * Fetch transaction hashes from transaction finalizer tasks
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchFromFinalizerTasks() {
    const oThis = this;

    let transactionFinalizerTask = new TransactionFinalizerTask();

    let pendingTasks = await transactionFinalizerTask.fetchTask(oThis.taskId);

    let taskPendingStatus = txFinalizerTaskConst.invertedStatuses[txFinalizerTaskConst.pendingStatus];

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
   * Get lock id
   *
   * @private
   */
  _setLockId() {
    const oThis = this,
      currentTimeMs = new Date().getTime(),
      randomNumber = basicHelper.getRandomNumber(10000000000000, 99999999999999),
      // NOTE: as we have prefetch > 1 it is very IMPORTANT to add this random no. here
      // to avoid same lock id being used for multiple queries
      lockIdPrefix = currentTimeMs + randomNumber;

    oThis.lockId = parseFloat(lockIdPrefix + '.' + oThis.cronProcessId);
  }

  /**
   * 1. If entry not present in tx meta and if transfer event present, then create entry in tx meta
   * 2. If entry present in pending, then update block number, status, timestamp
   * 3. If entry not found with tx hash in pending but found in meta, then update
   * 4. Clear session nonce cache if needed
   *
   * @private
   */
  async _updateStatusesInDb() {
    const oThis = this;

    let promises = [],
      receiptSuccessTxHashes = [],
      receiptFailureTxHashes = [],
      flushNonceCacheForSessionAddresses = [];

    for (let i = 0; i < oThis.transactionHashes.length; i++) {
      let txHash = oThis.transactionHashes[i],
        txData = oThis.txHashToTransactionDataMap[txHash],
        transactionStatus = parseInt(txData.transactionStatus),
        transactionInternalStatus = parseInt(txData.transactionInternalStatus),
        pendingTxData = oThis.txHashPendingTxDataMap[txHash],
        txMetaData = oThis.txHashToTxMetaDataMap[txHash],
        txMetaReceiptStatusStr = transactionStatus
          ? transactionMetaConst.successReceiptStatus
          : transactionMetaConst.failureReceiptStatus,
        txMetaReceiptStatusInt = transactionMetaConst.invertedReceiptStatuses[txMetaReceiptStatusStr],
        txMissingInPendingTx = false;

      if (txMetaData) {
        if (txMetaData.receiptStatus != txMetaReceiptStatusInt) {
          if (transactionStatus) {
            receiptSuccessTxHashes.push(txHash);
          } else {
            receiptFailureTxHashes.push(txHash);
          }
        }
      } else if (CommonValidators.validateObject(oThis.transactionTransfersMap[txHash])) {
        // if tx meta was not present we would create ONLY if there were transfer events in the receipt
        let promise = new TransactionMeta()
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
            // append this data in oThis.txHashToTxMetaDataMap for later usage
            oThis.txHashToTxMetaDataMap[txHash] = {
              status: transactionMetaConst.invertedStatuses[transactionMetaConst.minedStatus],
              receiptStatus: txMetaReceiptStatusInt,
              transactionUuid: txData.transaction_uuid,
              id: insertRsp.insertId
            };
          })
          .catch(function(txMetaInsertError) {
            logger.error('txMetaInsertError', txMetaInsertError);
            // this catch to avoid duplicate errors before lock acquiring
          });

        promises.push(promise);
      }

      // if pending tx record not found but txHash was present in tx_meta
      // we need to update tx_hash in pending_tx
      // initialize pendingTxData here and update query is handled below
      if (!CommonValidators.validateObject(pendingTxData) && txMetaData) {
        txMissingInPendingTx = true;
        pendingTxData = {
          transactionUuid: txMetaData.transactionUuid
        };
      }

      // as there still may be cases where for some tx we don't have pendingTxData
      if (CommonValidators.validateObject(pendingTxData)) {
        let pendingTxStatus;
        if (transactionStatus & transactionInternalStatus) {
          pendingTxStatus = pendingTransactionConstants.successStatus;
        } else {
          pendingTxStatus = pendingTransactionConstants.failedStatus;
        }

        if (
          pendingTxData.status !== pendingTxStatus ||
          pendingTxData.blockTimestamp !== txData.blockTimestamp ||
          pendingTxData.blockNumber !== txData.blockNumber
        ) {
          let updateQueryParams = {
            transactionUuid: pendingTxData.transactionUuid,
            status: pendingTxStatus,
            blockTimestamp: txData.blockTimestamp,
            blockNumber: txData.blockNumber,
            transactionHash: txHash
          };

          let promise = new PendingTransactionCrud(oThis.auxChainId)
            .update(updateQueryParams)
            .then(function(updatePendingTxRsp) {
              if (updatePendingTxRsp.isFailure()) {
                return Promise.reject(updatePendingTxRsp);
              }

              // reload the data in memory with ALL_NEW returned from query response
              oThis.txHashPendingTxDataMap[txHash] = updatePendingTxRsp.data;
            })
            .catch(function(updatePendingTxError) {
              if (txMissingInPendingTx) {
                // txHash was to be updated in pending_tx here. It failed thus we do not know of the pessimistic debits
                // fail balance settlement for this
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
                // do nothing as pending would be anyways deleted soon
                // downside here is that ES status remains as submitted.
              }
            });

          promises.push(promise);
        }
      }
    }

    await Promise.all(promises);

    // new loop since we need updated value for oThis.txHashPendingTxDataMap
    for (let i = 0; i < oThis.transactionHashes.length; i++) {
      let txHash = oThis.transactionHashes[i],
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
   *
   * @param addresses
   * @private
   */
  async _flushNonceCacheForSessionAddresses(addresses) {
    const oThis = this;

    let promises = [];

    for (let i = 0; i < addresses.length; i++) {
      promises.push(
        new NonceForSession({
          address: addresses[i],
          chainId: oThis.auxChainId
        }).clear()
      );
    }

    await Promise.all(promises);
  }

  /**
   * Acquire lock on transaction meta
   *
   * @return {Promise<void>}
   * @private
   */
  async _acquireLockOnTxMeta() {
    const oThis = this;

    await new TransactionMeta()
      .update({
        lock_id: oThis.lockId,
        status: transactionMetaConst.invertedStatuses[transactionMetaConst.finalizationInProcess]
      })
      .where({ associated_aux_chain_id: oThis.auxChainId })
      .where([
        'transaction_hash IN (?) AND status = ? AND lock_id IS NULL', // adding lock_id IS NULL to be extra safe, minedStatus should be enough ?
        oThis.transactionHashes,
        transactionMetaConst.invertedStatuses[transactionMetaConst.minedStatus]
      ])
      .fire();
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

    let dbRows = await transactionMeta.fetchByLockId(oThis.lockId);

    for (let i = 0; i < dbRows.length; i++) {
      let dbRow = dbRows[i];
      oThis.lockedMetaIds.push(dbRow.id);
      oThis.lockAcquiredTransactionHashes.push(dbRow.transaction_hash);
    }

    logger.debug('===oThis.lockAcquiredTransactionHashes', oThis.lockAcquiredTransactionHashes);
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

    // Don't remove the catch
    let ptxResp = await fetchPendingTxData.perform().catch(function(err) {
      logger.error(err);
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_t_f_bs_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: { err: err.toString() }
        })
      );
    });

    if (ptxResp.isFailure()) return Promise.reject(ptxResp);

    oThis.txHashPendingTxDataMap = ptxResp.data;

    logger.debug('====oThis.txHashPendingTxDataMap', oThis.txHashPendingTxDataMap);
  }

  /**
   *
   * fetch tx meta data
   *
   * @private
   */
  async _getTransactionMetaInfo() {
    const oThis = this;

    let dbRows = await new TransactionMeta().fetchByTransactionHashes(oThis.auxChainId, oThis.transactionHashes);

    for (let i = 0; i < dbRows.length; i++) {
      let dbRow = dbRows[i];
      oThis.txHashToTxMetaDataMap[dbRow.transaction_hash] = {
        status: dbRow.status,
        receiptStatus: dbRow.receipt_status,
        transactionUuid: dbRow.transaction_uuid,
        id: dbRow.id
      };
    }

    logger.debug('====oThis.txHashToTxMetaDataMap', oThis.txHashToTxMetaDataMap);
  }

  /**
   * Get transactions info
   *
   * @private
   */
  async _getTransactionInfo() {
    const oThis = this,
      TransactionGet = oThis.blockScannerObj.transaction.Get;

    let transactionGet = new TransactionGet(oThis.auxChainId, oThis.transactionHashes);

    let txGetRsp = await transactionGet.perform();

    if (txGetRsp.isFailure()) {
      return Promise.reject(txGetRsp);
    }

    oThis.txHashToTransactionDataMap = txGetRsp.data;
  }

  /**
   * _getTransactionDetails - Get transaction details for the given transaction hashes
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

    for (let i = 0; i < oThis.lockAcquiredTransactionHashes.length; i++) {
      let txHash = oThis.lockAcquiredTransactionHashes[i],
        txMetaData = oThis.txHashToTxMetaDataMap[txHash],
        pendingTransaction = oThis.txHashPendingTxDataMap[txHash];

      if (!CommonValidators.validateObject(pendingTransaction) || oThis.failedTxMetaIdsMap[txMetaData.id]) {
        // as we would not settle balances till record was found in pending_tx & tx_meta or if failedTxMetaIdsMap had it
        continue;
      }

      let unsettledDebits = pendingTransaction.unsettledDebits;

      if (!unsettledDebits) {
        continue;
      }

      for (let i = 0; i < unsettledDebits.length; i++) {
        let unsettledDebit = unsettledDebits[i],
          balanceKey = oThis._createKey(unsettledDebit.erc20Address, unsettledDebit.tokenHolderAddress),
          blockChainUnsettledDebitsBn = new BigNumber(unsettledDebit.blockChainUnsettleDebits),
          negativeBlockChainUnsettledDebitsBn = blockChainUnsettledDebitsBn.mul(negativeMultiplier),
          txMetaData = oThis.txHashToTxMetaDataMap[pendingTransaction.transactionHash],
          txMetaId = txMetaData['id'];

        if (oThis.balanceMap.hasOwnProperty(balanceKey)) {
          let buffer = oThis.balanceMap[balanceKey];

          buffer['affectedTxMetaIds'].push(txMetaId);
          buffer['blockChainUnsettleDebits'] = buffer['blockChainUnsettleDebits'].add(
            negativeBlockChainUnsettledDebitsBn
          );
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

    for (let i = 0; i < oThis.lockAcquiredTransactionHashes.length; i++) {
      let txHash = oThis.lockAcquiredTransactionHashes[i],
        transfersInfo = oThis.transactionTransfersMap[txHash],
        txMetaData = oThis.txHashToTxMetaDataMap[txHash],
        negativeMultiplier = new BigNumber(-1);

      if (oThis.failedTxMetaIdsMap[txMetaData.id]) {
        // if failedTxMetaIdsMap has it, ignore this tx
        continue;
      }

      for (let transferIndex in transfersInfo) {
        let transferInfo = transfersInfo[transferIndex],
          fromAddress = transferInfo.fromAddress,
          erc20Address = transferInfo.contractAddress,
          toAddress = transferInfo.toAddress,
          amountBn = new BigNumber(transferInfo.amount),
          negativeAmountBn = amountBn.mul(negativeMultiplier),
          txMetaData = oThis.txHashToTxMetaDataMap[txHash],
          txMetaId = txMetaData['id'],
          pendingTransaction = oThis.txHashPendingTxDataMap[txHash];

        if (!CommonValidators.validateObject(pendingTransaction)) {
          // as we would not settle balances till record was found in pending_tx & tx_meta
          continue;
        }

        oThis.erc20AddressesSet.add(erc20Address);

        // Handling for fromAddress
        if (!CommonValidators.validateZeroEthAddress(fromAddress)) {
          let fromBalanceKey = oThis._createKey(erc20Address, fromAddress);
          if (oThis.balanceMap.hasOwnProperty(fromBalanceKey)) {
            let buffer = oThis.balanceMap[fromBalanceKey];
            buffer['affectedTxMetaIds'].push(txMetaId);
            if (!buffer.hasOwnProperty('blockChainSettledBalance')) {
              buffer['blockChainSettledBalance'] = new BigNumber('0');
            }
            buffer['blockChainSettledBalance'] = buffer['blockChainSettledBalance'].add(negativeAmountBn);
          } else {
            oThis.balanceMap[fromBalanceKey] = {
              blockChainSettledBalance: negativeAmountBn,
              affectedTxMetaIds: [txMetaId]
            };
          }
        }

        // Handling for toAddress
        if (!CommonValidators.validateZeroEthAddress(toAddress)) {
          let toBalanceKey = oThis._createKey(erc20Address, toAddress);
          if (oThis.balanceMap.hasOwnProperty(toBalanceKey)) {
            let buffer = oThis.balanceMap[toBalanceKey];

            buffer['affectedTxMetaIds'].push(txMetaId);
            if (!buffer.hasOwnProperty('blockChainSettledBalance')) {
              buffer['blockChainSettledBalance'] = new BigNumber('0');
            }
            buffer['blockChainSettledBalance'] = buffer['blockChainSettledBalance'].add(amountBn);
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
   * Fetch balance shards for the erc20Addresses
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchBalanceShards() {
    const oThis = this,
      BalanceShardCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BalanceShardCache');

    let erc20Addresses = Array.from(oThis.erc20AddressesSet);

    logger.debug('erc20Addresses', erc20Addresses);

    if (erc20Addresses.length === 0) {
      return;
    }

    let balanceShardCacheObj = new BalanceShardCache({
      erc20Addresses: erc20Addresses,
      chainId: oThis.auxChainId
    });

    let response = await balanceShardCacheObj.fetch().catch(function(err) {
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

    for (let key in oThis.balanceMap) {
      let balanceSettlementData = oThis.balanceMap[key],
        resultAddresses = oThis._splitKey(key),
        erc20Address = resultAddresses[0],
        tokenHolderAddress = resultAddresses[1],
        shardNumber = oThis.balanceShardMap[erc20Address];

      if (basicHelper.isEmptyObject(shardNumber)) {
        logger.log('ignoring settling balance for unrecognized contract: ', erc20Address);
        continue;
      }

      let balanceModelObj = new BalanceModel({ shardNumber: shardNumber }),
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
          for (let i = 0; i < balanceSettlementData.affectedTxMetaIds.length; i++) {
            oThis.failedTxMetaIdsMap[balanceSettlementData.affectedTxMetaIds[i]] = 1;
          }
          oThis.debugParams.failedBalanceQueryLogs.push({
            updateQueryParams: updateQueryParams,
            updateQueryRsp: err.toHash(),
            affectedTxMetaIds: balanceSettlementData.affectedTxMetaIds
          });
        })
      );

      batchSize = batchSize + 1;

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
   *
   * @param {String} erc20Address
   * @param {String} tokenHolderAddress
   * @private
   */
  _createKey(erc20Address, tokenHolderAddress) {
    return `${erc20Address}-${tokenHolderAddress}`;
  }

  /**
   * Split key
   *
   * @param key
   * @private
   */
  _splitKey(key) {
    const oThis = this;

    let splitKey = key.split('-'),
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

    let failedTxMetaIds = Object.keys(oThis.failedTxMetaIdsMap);

    if (failedTxMetaIds.length > 0) {
      await new TransactionMeta().updateRecordsByReleasingLock({
        status: transactionMetaConst.finalizationFailed,
        ids: failedTxMetaIds
      });
    }

    let failedIdsMap = {};
    for (let i = 0; i < failedTxMetaIds.length; i++) {
      failedIdsMap[failedTxMetaIds[i]] = 1;
    }

    let successIds = [];
    for (let i = 0; i < oThis.lockedMetaIds.length; i++) {
      let id = oThis.lockedMetaIds[i];
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

    let postTxFinalizeSteps = new PostTxFinalizeSteps({
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
      // if failedTxMetaIdsMap is empty
      return transactionFinalizerTask.deleteTask(oThis.taskId);
    } else {
      oThis.debugParams['failedTxMetaIdsMap'] = oThis.failedTxMetaIdsMap;
      return transactionFinalizerTask
        .update({
          debug_params: JSON.stringify(oThis.debugParams)
        })
        .where({ id: oThis.taskId })
        .fire();
    }
  }
}

InstanceComposer.registerAsShadowableClass(BalanceSettler, coreConstants.icNameSpace, 'BalanceSettler');

module.exports = BalanceSettler;
