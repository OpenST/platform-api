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
  transactionMetaConst = require(rootPrefix + '/lib/globalConstant/transactionMeta'),
  txFinalizerTaskConst = require(rootPrefix + '/lib/globalConstant/transactionFinalizerTask'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
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
    oThis.taskValid = false;
  }

  /**
   * Perform transaction finalization
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis._init();

    await oThis._fetchFromFinalizerTasks();

    if (!oThis.taskValid) {
      return responseHelper.successWithData({}); // ACK message
    }

    await oThis._acquireLockOnTxMeta();

    await oThis._fetchLockAcquiredTransactions();

    await oThis._getUnsettledDebitInfo();

    if (oThis.getUnsettledDebitInfoFailed) {
      await oThis._handleFailureByLockId();

      return responseHelper.successWithData({});
    }

    await oThis._getTransferDetails();

    if (oThis.getTransferDetailsFailed) {
      await oThis._handleFailureByLockId();

      return responseHelper.successWithData({});
    }

    await oThis._fetchBalanceShards();

    if (oThis.fetchBalanceShardsFailed) {
      await oThis._handleFailureByLockId();

      return responseHelper.successWithData({});
    }

    oThis._aggregateAmounts();

    console.log('====oThis.balanceMap', oThis.balanceMap);

    await oThis._settleBalances();

    if (oThis.settlementFailed) {
      await oThis._handleSettlementFailure();

      return responseHelper.successWithData({});
    }

    await oThis._releaseLockAndMarkSuccess();

    await oThis._processPendingTransactions();

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

    oThis.blockScannerObj = await blockScannerProvider.getInstance([oThis.auxChainId]);
    oThis.balanceMap = {};
    oThis.erc20Addresses = new Set([]);
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
      // ACK RMQ.
      return Promise.resolve();
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
   * Acquire lock on transaction meta
   *
   * @return {Promise<void>}
   * @private
   */
  async _acquireLockOnTxMeta() {
    const oThis = this,
      transactionMeta = new TransactionMeta();

    oThis._setLockId();

    return transactionMeta.acquireLockWithTxHashes({
      lockId: oThis.lockId,
      transactionHashes: oThis.transactionHashes,
      updateStatusTo: transactionMetaConst.finalizationInProcess,
      selectWithStatus: transactionMetaConst.mined,
      retryLimit: transactionMetaConst.retryLimits[transactionMetaConst.mined]
    });
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

    oThis.transactionHashes = [];
    oThis.txHashToMetaIdMap = {};

    for (let i = 0; i < responses.length; i++) {
      let response = responses[i];
      oThis.txHashToMetaIdMap[response.transaction_hash] = response.id;
      oThis.transactionHashes.push(response.transaction_hash);
    }

    console.log('===oThis.transactionHashes', oThis.transactionHashes);
  }

  /**
   * Get unsettled debit info from pending transactions
   *
   * @return {Promise<void>}
   * @private
   */
  async _getUnsettledDebitInfo() {
    const oThis = this,
      fetchPendingTxData = new FetchPendingTxData(oThis.auxChainId, oThis.transactionHashes);

    oThis.getUnsettledDebitInfoFailed = true;

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

    oThis.pendingTransactionData = ptxResp.data;

    console.log('====oThis.pendingTransactionData', oThis.pendingTransactionData);

    oThis.getUnsettledDebitInfoFailed = false;
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

    for (let i = 0; i < oThis.transactionHashes.length; i++) {
      let fetchTransfers = new Transfer(oThis.auxChainId, oThis.transactionHashes[i], {
        pageSize: TRANSFERS_PAGE_SIZE
      });

      promiseArray.push(
        fetchTransfers.perform().catch(function(err) {
          logger.error(err);

          return responseHelper.error({
            internal_error_identifier: 'l_t_f_bs_3',
            api_error_identifier: 'something_went_wrong',
            debug_options: { transactionHash: oThis.transactionHashes[i] }
          });
        })
      );
    }

    oThis.transfers = [];

    let responses = await Promise.all(promiseArray);

    for (let i = 0; i < responses.length; i++) {
      let txData = responses[i].data,
        transfers = null;

      if (responses[i].isFailure()) {
        return responses[i];
      }

      // only one transaction hash in txData
      for (let txHash in txData) {
        transfers = txData[txHash]['transfers'];
        transfers['txHash'] = txHash;
      }

      oThis.transfers.concat(transfers);
    }

    console.log('==oThis.transfers', oThis.transfers);

    oThis.getTransferDetailsFailed = false;
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
  }

  /**
   * Aggregate pending transaction data
   *
   * @return {*|result}
   * @private
   */
  _aggregatePendingTransactions() {
    const oThis = this;

    for (let txUuid in oThis.pendingTransactionData) {
      let pendingTransaction = oThis.pendingTransactionData[txUuid],
        unsettledDebits = pendingTransaction.unsettledDebits[i];

      // Mark batch as failed if a pending transaction is failed one
      if (
        pendingTransaction.status ==
        pendingTransactionConstants.invertedStatuses[pendingTransactionConstants.failedStatus]
      ) {
        return responseHelper.successWithData({});
      }

      oThis.erc20Addresses.add(unsettledDebits.erc20Address);

      let balanceKey = unsettledDebits.erc20Address + '-' + unsettledDebits.tokenHolderAddress,
        blockChainUnsettledDebitsBn = new BigNumber(unsettledDebits.blockChainUnsettleDebits),
        negativeMultiplier = new BigNumber(-1);

      for (let i = 0; i < pendingTransaction.unsettledDebits.length; i++) {
        if (oThis.balanceMap.hasOwnProperty(balanceKey)) {
          let prevBlockChainUnsettledDebitsBn = oThis.balanceMap[balanceKey],
            affectedTxMetaIds = oThis.balanceMap[balanceKey].affectedTxMetaIds;

          affectedTxMetaIds.push(oThis.txHashToMetaIdMap[pendingTransaction.transactionHash]);

          oThis.balanceMap[balanceKey] = {
            blockChainUnsettleDebits: prevBlockChainUnsettledDebitsBn
              .add(blockChainUnsettledDebitsBn)
              .mul(negativeMultiplier),
            affectedTxMetaIds: affectedTxMetaIds
          };
        } else {
          oThis.balanceMap[balanceKey] = {
            blockChainUnsettleDebits: blockChainUnsettledDebitsBn.mul(negativeMultiplier),
            affectedTxMetaIds: [oThis.txHashToMetaIdMap[pendingTransaction.transactionHash]]
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

    for (let i = 0; i < oThis.transfers.length; i++) {
      let transferInfo = oThis.transfers[i],
        fromAddress = transferInfo.fromAddress,
        erc20Address = transferInfo.contractAddress,
        toAddress = transferInfo.toAddress,
        negativeMultiplier = new BigNumber(-1);

      let fromBalanceKey = erc20Address + '-' + fromAddress,
        toBalanceKey = erc20Address + '-' + toAddress,
        finalDebitAmountBn = null;

      oThis.erc20Addresses.add(erc20Address);

      // Handling for fromAddress
      if (oThis.balanceMap.hasOwnProperty(fromBalanceKey)) {
        let debitAmountBn = new BigNumber(transferInfo.amount),
          prevDebitAmountBn = new BigNumber(oThis.balanceMap[fromBalanceKey].blockChainSettledBalance),
          affectedTxMetaIdsForFrom = oThis.balanceMap[fromBalanceKey].affectedTxMetaIds;

        finalDebitAmountBn = debitAmountBn.add(prevDebitAmountBn);

        affectedTxMetaIdsForFrom.push(oThis.txHashToMetaIdMap[oThis.transfers[i].txHash]);

        oThis.balanceMap[fromBalanceKey] = {
          blockChainSettledBalance: finalDebitAmountBn.mul(negativeMultiplier),
          affectedTxMetaIds: affectedTxMetaIdsForFrom
        };
      } else {
        let debitAmountBn = new BigNumber(transferInfo.amount);

        oThis.balanceMap[fromBalanceKey] = {
          blockChainSettledBalance: debitAmountBn.mul(negativeMultiplier),
          affectedTxMetaIds: [oThis.txHashToMetaIdMap[oThis.transfers[i].txHash]]
        };
      }

      // Handling for toAddress
      if (oThis.balanceMap.hasOwnProperty(toBalanceKey)) {
        let affectedTxMetaIdsForTo = oThis.balanceMap[toBalanceKey].affectedTxMetaIds;

        affectedTxMetaIdsForTo.push(oThis.txHashToMetaIdMap[oThis.transfers[i].txHash]);

        oThis.balanceMap[toBalanceKey] = {
          blockChainSettledBalance: finalDebitAmountBn,
          affectedTxMetaIds: affectedTxMetaIdsForTo
        };
      } else {
        let debitAmountBn = new BigNumber(transferInfo.amount);

        oThis.balanceMap[toBalanceKey] = {
          blockChainSettledBalance: debitAmountBn,
          affectedTxMetaIds: [oThis.txHashToMetaIdMap[oThis.transfers[i].txHash]]
        };
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

    let erc20Addresses = Array.from(oThis.erc20Addresses);

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

    console.log('===oThis.balanceShardMap', oThis.balanceShardMap);

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

    oThis.settlementFailed = true;

    let promiseArray = [],
      batchSize = 0;

    oThis.failedIds = [];
    oThis.debugParams = {};

    for (let key in oThis.balanceMap) {
      let resultAddresses = oThis._splitKey(key),
        erc20Address = resultAddresses[0],
        tokenHolderAddress = resultAddresses[1],
        shardNumber = oThis.balanceShardMap[erc20Address],
        balanceModelObj = new BalanceModel({ shardNumber: shardNumber });

      promiseArray.push(
        balanceModelObj
          .update({
            tokenHolderAddress: tokenHolderAddress,
            erc20Address: erc20Address,
            blockChainUnsettleDebits: oThis.balanceMap[key].blockChainUnsettleDebits.toString(10),
            blockChainSettledBalance: oThis.balanceMap[key].blockChainSettledBalance.toString(10)
          })
          .catch(function(err) {
            logger.error(err);

            oThis.failedIds.concat(oThis.balanceMap[key].affectedTxMetaIds);

            for (let i = 0; i < oThis.balanceMap[key].affectedTxMetaIds.length; i++) {
              let txMetaId = oThis.balanceMap[key].affectedTxMetaIds[i];

              oThis.debugParams[txMetaId] = {
                tokenHolderAddress: tokenHolderAddress,
                erc20Address: erc20Address,
                blockChainUnsettleDebits: oThis.balanceMap[key].blockChainUnsettleDebits.toString(10),
                blockChainSettledBalance: oThis.balanceMap[key].blockChainSettledBalance.toString(10),
                error: err.toString()
              };
            }
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

    oThis.settlementFailed = false;
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
  async _releaseLockAndMarkSuccess() {
    const oThis = this,
      transactionMeta = new TransactionMeta();

    return transactionMeta.releaseLockAndMarkStatus({
      lockId: oThis.lockId,
      status: transactionMetaConst.finalized
    });
  }

  /**
   * Perform deletion and after receipt publish of pending transactions
   *
   * @return {Promise<void>}
   * @private
   */
  async _processPendingTransactions() {
    const oThis = this;

    let postTxFinalizeSteps = new PostTxFinalizeSteps({
      chainId: oThis.auxChainId,
      blockNumber: oThis.blockNumber,
      transactionHashes: oThis.transactionHashes
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

    return transactionFinalizerTask.deleteTask(oThis.taskId);
  }

  /**
   * Handle settlement failure using lock id(for entire batch)
   *
   * @return {Promise<void>}
   * @private
   */
  async _handleFailureByLockId() {
    const oThis = this,
      transactionMeta = new TransactionMeta(),
      transactionFinalizerTask = new TransactionFinalizerTask();

    await transactionMeta.releaseLockAndMarkStatus({
      lockId: oThis.lockId,
      status: transactionMetaConst.finalizationFailed
    });

    await transactionFinalizerTask.markTaskFailed(oThis.taskId, {});
  }

  /**
   * Handle settlement failure
   *
   * @return {Promise<void>}
   * @private
   */
  async _handleSettlementFailure() {
    const oThis = this,
      transactionMeta = new TransactionMeta(),
      transactionFinalizerTask = new TransactionFinalizerTask();

    let promiseArray = [];

    for (let id in oThis.debugParams) {
      promiseArray.push(transactionMeta.markFailed(id, transactionMetaConst.finalizationFailed, oThis.debugParams[id]));
    }

    await Promise.all(promiseArray);

    await transactionFinalizerTask.markTaskFailed(oThis.taskId, {});
  }
}

InstanceComposer.registerAsShadowableClass(BalanceSettler, coreConstants.icNameSpace, 'BalanceSettler');

module.exports = BalanceSettler;
