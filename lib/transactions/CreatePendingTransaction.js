'use strict';

/**
 * Module to create pending transaction for particular chain.
 *
 * @module lib/transactions/CreatePendingTransaction
 */

const uuidv4 = require('uuid/v4');

const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner');

class CreatePendingTransaction {
  constructor(chainId) {
    const oThis = this;

    oThis.chainId = chainId;
  }

  /***
   *
   * Insert Pending Transaction in dynamo
   *
   * @return {Promise<*>}
   */
  async insertPendingTransaction(transactionData, transactionHash, extraData) {
    const oThis = this;

    // Get blockScanner object.
    const blockScannerObj = await blockScannerProvider.getInstance([oThis.chainId]);

    // Get pending transaction model
    const pendingTransactionModel = blockScannerObj.model.PendingTransaction,
      pendingTrxObj = new pendingTransactionModel({ chainId: oThis.chainId });

    let insertData = {
      transactionUuid: uuidv4(),
      chainId: oThis.chainId,
      transactionHash: transactionHash || '',
      fromAddress: transactionData.from,
      toAddress: transactionData.to,
      value: basicHelper.convertToBigNumber(transactionData.value).toString(10),
      gasLimit: basicHelper.convertToBigNumber(transactionData.gas).toString(10),
      gasPrice: basicHelper.convertToBigNumber(transactionData.gasPrice).toString(10),
      nonce: basicHelper.convertToBigNumber(transactionData.nonce).toString(10),
      input: transactionData.data,
      r: transactionData.r,
      s: transactionData.s,
      v: transactionData.v,
      afterReceipt: JSON.stringify(extraData || {}),
      createdTimestamp: Math.floor(Date.now() / 1000).toString(),
      updatedTimeStamp: Math.floor(Date.now() / 1000).toString()
    };

    return pendingTrxObj.putItem(insertData);
  }
}

module.exports = CreatePendingTransaction;
