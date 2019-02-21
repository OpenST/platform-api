'use strict';
/*
 * Class file for finalizing the transaction and settling the balances
 *
 * @module lib/transactions/finalizer/BalanceSettler.js
 */

const rootPrefix = '../../..',
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
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
  TransactionFinalizerTask = require(rootPrefix + '/app/models/mysql/TransactionFinalizerTask');

const BigNumber = require('bignumber.js'),
  TRANSFERS_PAGE_SIZE = 25,
  BALANCE_SETTLE_BATCH_SZ = 10;

const OSTBase = require('@openstfoundation/openst-base'),
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
      await oThis._markAsFailure(customError);
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

    await oThis._markTxAsMined();

    await oThis._acquireLockOnTxMeta();

    await oThis._fetchLockAcquiredTransactions();

    if (oThis.lockAcquiredTransactionHashes.length === 0) {
      return responseHelper.successWithData({});
    }

    await oThis._getTransferDetails();

    await oThis._fetchBalanceShards();

    await oThis._aggregateAmounts();

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
    oThis.txHashTransfersArrayMap = {};
    oThis.failedTxMetaIds = [];
    oThis.debugParams = {
      failedBalanceQueryLogs: []
    };
    oThis.transactionHashes = null;
    oThis.lockAcquiredTransactionHashes = [];
    oThis.txHashToTransactionDataMap = null;
    oThis.markAllFailed = false;
    oThis.lockedTxHashToMetaIdMap = {};
    oThis.lockedMetaIds = [];
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

    if (
      pendingTasks.length <= 0 ||
      !pendingTasks[0].transaction_hashes ||
      pendingTasks[0].status != taskPendingStatus
    ) {
      logger.error(
        'l_t_f_bs_1',
        'Task not found for balance settler. unAckCount ->',
        oThis.unAckCount,
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

    oThis.taskValid = true;
  }

  /**
   * Get lock id
   *
   * @private
   */
  _setLockId() {
    const oThis = this,
      timeInSecs = Math.floor(Date.now() / 1000);

    oThis.lockId = timeInSecs + oThis.cronProcessId / 1000;
  }

  /**
   * Check tx status in pending and meta and mark as mined if required
   * @private
   */
  async _markTxAsMined() {
    const oThis = this;

    let promises = [],
      txHashesToBeUpdatedInMeta = [];

    for (let txHash in oThis.txHashPendingTxDataMap) {
      let pendingTxData = oThis.txHashPendingTxDataMap[txHash];

      if (pendingTxData.status !== pendingTransactionConstants.minedStatus) {
        let txData = oThis.txHashToTransactionDataMap[txHash],
          txStatus;

        if (txData.transactionStatus & txData.transactionInternalStatus) {
          txStatus = pendingTransactionConstants.minedStatus;
        } else {
          txStatus = pendingTransactionConstants.failedStatus;
        }

        let promise = new PendingTransactionCrud(oThis.auxChainId)
          .update({
            transactionUuid: pendingTxData.transactionUuid,
            transactionHash: txHash,
            status: txStatus
          })
          .catch(async function(updatePendingTxError) {
            // Do nothing
          });

        promises.push(promise);

        txHashesToBeUpdatedInMeta.push(txHash);
      }

      if (pendingTxData.erc20Address) {
        oThis.erc20AddressesSet.add(pendingTxData.erc20Address);
      }
    }

    await Promise.all(promises);

    if (txHashesToBeUpdatedInMeta.length > 0) {
      await new TransactionMeta()
        .update({
          status: transactionMetaConst.invertedStatuses[transactionMetaConst.minedStatus],
          updated_at: new Date()
        })
        .where(['transaction_hash IN (?)', txHashesToBeUpdatedInMeta])
        .fire();
    }
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
      .where([
        'transaction_hash IN (?) AND status = ?',
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

    let responses = await transactionMeta.fetchByLockId(oThis.lockId);

    for (let i = 0; i < responses.length; i++) {
      let response = responses[i];
      oThis.lockedTxHashToMetaIdMap[response.transaction_hash] = response.id;
      oThis.lockedMetaIds.push(response.id);
      oThis.lockAcquiredTransactionHashes.push(response.transaction_hash);
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
      return responseHelper.error({
        internal_error_identifier: 'l_t_f_bs_2',
        api_error_identifier: 'something_went_wrong',
        debug_options: { err: err.toString() }
      });
    });

    if (ptxResp.isFailure()) {
      return ptxResp;
    }

    oThis.txHashPendingTxDataMap = ptxResp.data;

    logger.debug('====oThis.txHashPendingTxDataMap', oThis.txHashPendingTxDataMap);
  }

  /**
   * Get transactions info
   *
   * @private
   */
  async _getTransactionInfo() {
    const oThis = this,
      TransactionGet = oThis.blockScannerObj.transaction.Get;

    let notMinedTxHashes = [];
    for (let txHash in oThis.txHashPendingTxDataMap) {
      let pendingTxData = oThis.txHashPendingTxDataMap[txHash];
      if (pendingTxData.status !== pendingTransactionConstants.minedStatus) {
        notMinedTxHashes.push(txHash);
      }
    }

    if (notMinedTxHashes.length === 0) {
      return;
    }

    let transactionGet = new TransactionGet(oThis.auxChainId, notMinedTxHashes);

    let txGetRsp = await transactionGet.perform();

    if (txGetRsp.isFailure()) {
      return Promise.reject(txGetRsp);
    }

    oThis.txHashToTransactionDataMap = txGetRsp.data;

    logger.debug('====oThis.txHashToTransactionDataMap', oThis.txHashToTransactionDataMap);
  }

  /**
   * _getTransactionDetails - Get transaction details for the given transaction hashes
   *
   * @return {Promise<void>}
   * @private
   */
  async _getTransferDetails() {
    const oThis = this,
      Transfer = oThis.blockScannerObj.transfer.GetAll;

    oThis.getTransferDetailsFailed = true;

    let promiseArray = [];

    // TODO: Don't limit no.of transfers fetched

    for (let i = 0; i < oThis.lockAcquiredTransactionHashes.length; i++) {
      let fetchTransfers = new Transfer(oThis.auxChainId, oThis.lockAcquiredTransactionHashes[i], {
        pageSize: TRANSFERS_PAGE_SIZE
      });

      promiseArray.push(
        fetchTransfers.perform().catch(function(err) {
          logger.error(err);
          return responseHelper.error({
            internal_error_identifier: 'l_t_f_bs_3',
            api_error_identifier: 'something_went_wrong',
            debug_options: { transactionHash: oThis.lockAcquiredTransactionHashes[i] }
          });
        })
      );
    }

    let responses = await Promise.all(promiseArray);

    for (let i = 0; i < responses.length; i++) {
      let transfersData = responses[i].data,
        transfers = null;

      if (responses[i].isFailure()) {
        return responses[i];
      }

      // only one transaction hash in txData
      for (let txHash in transfersData) {
        transfers = transfersData[txHash]['transfers'];
        for (let transferIndex in transfers) {
          oThis.erc20AddressesSet.add(transfers[transferIndex]['contractAddress']);
        }
        oThis.txHashTransfersArrayMap[txHash] = transfers;
      }
    }

    logger.debug('==oThis.txHashTransfersArrayMap', oThis.txHashTransfersArrayMap);
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

    for (let txUuid in oThis.txHashPendingTxDataMap) {
      let pendingTransaction = oThis.txHashPendingTxDataMap[txUuid],
        unsettledDebits = pendingTransaction.unsettledDebits;

      for (let i = 0; i < unsettledDebits.length; i++) {
        let unsettledDebit = unsettledDebits[i],
          balanceKey = unsettledDebit.erc20Address + '-' + unsettledDebit.tokenHolderAddress,
          blockChainUnsettledDebitsBn = new BigNumber(unsettledDebit.blockChainUnsettleDebits),
          txMetaId = oThis.lockedTxHashToMetaIdMap[pendingTransaction.transactionHash];

        if (oThis.balanceMap.hasOwnProperty(balanceKey)) {
          let buffer = oThis.balanceMap[balanceKey];

          buffer['affectedTxMetaIds'].push(txMetaId);
          buffer['blockChainUnsettleDebits'] = buffer['blockChainUnsettleDebits']
            .add(blockChainUnsettledDebitsBn)
            .mul(negativeMultiplier);
        } else {
          oThis.balanceMap[balanceKey] = {
            blockChainUnsettleDebits: blockChainUnsettledDebitsBn.mul(negativeMultiplier),
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

    for (let txHash in oThis.txHashTransfersArrayMap) {
      let transfersInfo = oThis.txHashTransfersArrayMap[txHash],
        negativeMultiplier = new BigNumber(-1);

      for (let transferIndex in transfersInfo) {
        let transferInfo = transfersInfo[transferIndex],
          fromAddress = transferInfo.fromAddress,
          erc20Address = transferInfo.contractAddress,
          toAddress = transferInfo.toAddress,
          amount = new BigNumber(transferInfo.amount),
          fromBalanceKey = erc20Address + '-' + fromAddress,
          toBalanceKey = erc20Address + '-' + toAddress,
          txMetaId = oThis.lockedTxHashToMetaIdMap[txHash];

        // Handling for fromAddress
        if (oThis.balanceMap.hasOwnProperty(fromBalanceKey)) {
          let buffer = oThis.balanceMap[fromBalanceKey];

          buffer['affectedTxMetaIds'].push(txMetaId);
          if (!buffer['blockChainSettledBalance']) {
            buffer['blockChainSettledBalance'] = new BigNumber('0');
          }
          buffer['blockChainSettledBalance'] = buffer['blockChainSettledBalance'].add(amount.mul(negativeMultiplier));
        } else {
          oThis.balanceMap[fromBalanceKey] = {
            blockChainSettledBalance: amount.mul(negativeMultiplier),
            affectedTxMetaIds: [txMetaId]
          };
        }

        // Handling for toAddress
        if (oThis.balanceMap.hasOwnProperty(toBalanceKey)) {
          let buffer = oThis.balanceMap[toBalanceKey];

          buffer['affectedTxMetaIds'].push(txMetaId);
          if (!buffer['blockChainSettledBalance']) {
            buffer['blockChainSettledBalance'] = new BigNumber('0');
          }
          buffer['blockChainSettledBalance'] = buffer['blockChainSettledBalance'].add(amount);
        } else {
          oThis.balanceMap[toBalanceKey] = {
            blockChainSettledBalance: amount,
            affectedTxMetaIds: [txMetaId]
          };
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

    oThis.fetchBalanceShardsFailed = true;

    let erc20Addresses = Array.from(oThis.erc20AddressesSet);

    logger.debug('erc20Addresses', erc20Addresses);

    let balanceShardCacheObj = new BalanceShardCache({
      erc20Addresses: erc20Addresses,
      chainId: oThis.auxChainId
    });

    let response = await balanceShardCacheObj.fetch().catch(function(err) {
      logger.error(err);

      return responseHelper.error({
        internal_error_identifier: 'l_t_f_bs_4',
        api_error_identifier: 'something_went_wrong',
        debug_options: { err: err.toString() }
      });
    });

    if (response.isFailure()) {
      return response;
    }

    oThis.balanceShardMap = response.data;

    logger.debug('===oThis.balanceShardMap', oThis.balanceShardMap);

    oThis.fetchBalanceShardsFailed = false;
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
        shardNumber = oThis.balanceShardMap[erc20Address],
        balanceModelObj = new BalanceModel({ shardNumber: shardNumber }),
        updateQueryParams = {
          tokenHolderAddress: tokenHolderAddress,
          erc20Address: erc20Address
        };

      if (balanceSettlementData.blockChainUnsettleDebits) {
        updateQueryParams.blockChainUnsettleDebits = balanceSettlementData.blockChainUnsettleDebits.toString(10);
      }
      if (balanceSettlementData.blockChainSettledBalance) {
        updateQueryParams.blockChainSettledBalance = balanceSettlementData.blockChainSettledBalance.toString(10);
      }

      promiseArray.push(
        balanceModelObj.updateBalance(updateQueryParams).catch(function(err) {
          logger.error('Balance Settlement Error from BalanceSettler', err);
          oThis.failedTxMetaIds.concat(balanceSettlementData.affectedTxMetaIds);
          oThis.debugParams.failedBalanceQueryLogs.push({
            updateQueryParams: updateQueryParams,
            updateQueryRsp: err.toString()
          });
        })
      );

      batchSize = batchSize + 1;

      if (batchSize == BALANCE_SETTLE_BATCH_SZ) {
        await Promise.all(promiseArray);
        batchSize = 0;
      }
    }

    if (batchSize > 0) {
      await Promise.all(promiseArray);
    }
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

    if (oThis.failedTxMetaIds.length > 0) {
      await new TransactionMeta()
        .update({
          status: transactionMetaConst.invertedStatuses[transactionMetaConst.finalizationFailed],
          updated_at: new Date()
        })
        .where(['id IN (?)', oThis.failedTxMetaIds])
        .fire();
    }

    let failedIdsMap = {};
    for (let i = 0; i < oThis.failedTxMetaIds.length; i++) {
      failedIdsMap[oThis.failedTxMetaIds[i]] = 1;
    }

    let successIds = [];
    for (let i = 0; i < oThis.lockedMetaIds.length; i++) {
      let id = oThis.lockedMetaIds[i];
      if (!failedIdsMap[id]) {
        successIds.push(id);
      }
    }

    if (successIds.length > 0) {
      await new TransactionMeta()
        .update({
          status: transactionMetaConst.invertedStatuses[transactionMetaConst.finalizedStatus],
          updated_at: new Date()
        })
        .where(['id IN (?)', successIds])
        .fire();
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
      transactionHashes: oThis.lockAcquiredTransactionHashes,
      txHashPendingTxDataMap: oThis.txHashPendingTxDataMap
    });

    await postTxFinalizeSteps.perform();
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
    if (oThis.failedTxMetaIds.length === 0) {
      return transactionFinalizerTask.deleteTask(oThis.taskId);
    } else {
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
