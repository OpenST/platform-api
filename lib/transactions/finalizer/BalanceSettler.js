'use strict';
/*
 * Class file for finalizing the transaction and settling the balances
 *
 * @module lib/transactions/Finalizer.js
 */

const rootPrefix = '../..',
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  TransactionFinalizerTask = require(rootPrefix + '/app/models/mysql/TransactionFinalizerTask');

const BigNumber = require('bignumber.js'),
  TRANSFERS_PAGE_SIZE = 25;

class TransactionFinalizer {
  /**
   * @constructor
   *
   * @param params
   * @param params.taskId              {Number} - transaction finalizer task id
   * @param params.auxChainId          {Number} - auxiliary chain id
   * @param params.transactionHashes   {Array}  - array of transaction hashes
   */
  constructor(params) {
    const oThis = this;

    oThis.taskId = params.taskId;
    oThis.auxChainId = params.auxChainId;
    oThis.transactionHashes = params.transactionHashes;
  }

  /**
   * Perform transaction finalization
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis._init();

    await oThis._getTransferDetails();

    await oThis._aggregateAmounts();

    await oThis._getPessimisticDebitInfo();

    await oThis._settleBalances();

    await oThis._deleteTransactionFinalizerTask();
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

    let promiseArray = [];

    for (let i = 0; i < oThis.transactionHashes.length; i++) {
      let transfer = new Transfer(oThis.auxChainId, oThis.transactionHashes[i], {
        pageSize: TRANSFERS_PAGE_SIZE
      });
      promiseArray.push(transfer.perform());
    }

    oThis.transfers = [];

    let responses = await Promise.all(promiseArray);

    for (let i = 0; i < responses.length; i++) {
      let txData = responses[i].data;

      let transfers = null;

      // only one transaction hash in txData
      for (let txHash in txData) {
        transfers = txData[txHash]['transfers'];
      }

      oThis.transfers.concat(transfers);
    }
  }

  /**
   * Aggregate amounts based on hash
   *
   * @return {Promise<void>}
   * @private
   */
  async _aggregateAmounts() {
    const oThis = this;

    oThis.balanceMap = {}; // Address to balances map

    for (let i = 0; i < oThis.transfers.length; i++) {
      let transferInfo = oThis.transfers[i],
        fromAddress = transferInfo.fromAddress,
        toAddress = transferInfo.toAddress;

      if (oThis.balanceMap.hasOwnProperty(fromAddress)) {
        let debitAmountBn = new BigNumber(transferInfo.amount),
          prevDebitAmountBn = new BigNumber(oThis.balanceMap[fromAddress].debitAmount);

        oThis.balanceMap[fromAddress].debitAmount = debitAmountBn.add(prevDebitAmountBn).toString();
        oThis.balanceMap[toAddress].creditAmount = oThis.balanceMap[fromAddress].debitAmount;
      } else {
        let debitAmountBn = new BigNumber(transferInfo.amount);

        oThis.balanceMap[fromAddress] = {
          debitAmount: debitAmountBn.toString()
        };

        oThis.balanceMap[toAddress] = {
          creditAmount: debitAmountBn.toString()
        };
      }
    }
  }

  /**
   * Get pessimistic debit info from pending transactions
   *
   * @return {Promise<void>}
   * @private
   */
  async _getPessimisticDebitInfo() {
    const oThis = this,
      PendingTransactionModel = oThis.blockScannerObj.model.PendingTransaction,
      PendingTransactionCache = oThis.blockScannerObj.cache.PendingTransaction;

    let pendingTransactionModel = new PendingTransactionModel({
      chainId: oThis.auxChainId
    });

    let response = await pendingTransactionModel.getPendingTransactionsWithHashes(
      oThis.auxChainId,
      oThis.transactionHashes
    );

    let txUuids = [];

    for (let txHash in response.data) {
      txUuids.push(response.data[txHash].transactionUuid);
    }

    let pendingTransactionCache = new PendingTransactionCache({
      chainId: oThis.auxChainId,
      transactionUuids: txUuids
    });

    let ptxResp = await pendingTransactionCache.fetch();

    let pendingTransactionData = ptxResp.data;

    for (let txUuid in pendingTransactionData) {
      let pendingTransaction = pendingTransactionData[txUuid];

      if (oThis.balanceMap.hasOwnProperty(pendingTransaction.fromAddress)) {
        let prevPessimisticDebit = oThis.balanceMap[pendingTransaction.fromAddress],
          prevPessimisticDebitBn = new BigNumber(prevPessimisticDebit);

        // TODO: Process the amount from pending transaction
      } else {
        oThis.balanceMap[pendingTransaction.fromAddress] = {
          pessimisticDebit: '' // TODO: Change amount once key is confirmed
        };
      }
    }
  }

  /**
   * Settle balances
   *
   * @return {Promise<void>}
   * @private
   */
  async _settleBalances() {
    const oThis = this;
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
}

module.exports = TransactionFinalizer;
