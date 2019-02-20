'use strict';

/**
 * Module to create pending transaction for particular chain.
 *
 * @module lib/transactions/PendingTransactionCrud
 */

const uuidv4 = require('uuid/v4');

const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  PendingTransactionFormatter = require(rootPrefix + '/lib/formatter/blockScannerDdbData/PendingTransaction'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner');

class PendingTransactionCrud {
  /**
   *
   * @constructor
   *
   * @param chainId
   */
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
  async create(params) {
    const oThis = this,
      transactionData = params.transactionData,
      transactionHash = params.transactionHash,
      transactionUuid = params.transactionUuid || uuidv4(),
      afterReceipt = params.afterReceipt;

    // Get blockScanner object.
    const blockScannerObj = await blockScannerProvider.getInstance([oThis.chainId]);

    // Get pending transaction model
    const PendingTransactionModel = blockScannerObj.model.PendingTransaction,
      pendingTransactionModel = new PendingTransactionModel({ chainId: oThis.chainId });

    let dataToInsert = {
      transactionUuid: transactionUuid,
      chainId: oThis.chainId,
      transactionHash: transactionHash || '',
      fromAddress: transactionData.from || '',
      toAddress: transactionData.to || '',
      value: basicHelper.convertToBigNumber(transactionData.value).toString(10),
      gasLimit: basicHelper.convertToBigNumber(transactionData.gas).toString(10),
      gasPrice: basicHelper.convertToBigNumber(transactionData.gasPrice).toString(10),
      input: transactionData.data || '',
      afterReceipt: JSON.stringify(afterReceipt || {}),
      createdTimestamp: Math.floor(Date.now() / 1000).toString(),
      updatedTimeStamp: Math.floor(Date.now() / 1000).toString()
    };

    if (transactionData.nonce) {
      dataToInsert.nonce = basicHelper.convertToBigNumber(transactionData.nonce).toString(10);
    }
    if (params.ruleId) {
      dataToInsert.ruleId = params.ruleId;
    }
    if (params.ruleAddress) {
      dataToInsert.ruleAddress = params.ruleAddress;
    }
    if (params.tokenId) {
      dataToInsert.tokenId = params.tokenId;
    }
    if (params.sessionKeyNonce) {
      dataToInsert.sessionKeyNonce = params.sessionKeyNonce;
    }
    if (params.status) {
      dataToInsert.status = params.status;
    }
    if (params.transferExecutableData) {
      dataToInsert.transferExecutableData = params.transferExecutableData;
    }
    if (params.unsettledDebits) {
      dataToInsert.unsettledDebits = params.unsettledDebits;
    }
    if (params.eip1077Signature) {
      dataToInsert.eip1077Signature = params.eip1077Signature;
    }
    if (params.metaProperty) {
      dataToInsert.metaProperty = params.metaProperty;
    }
    if (params.transfers) {
      dataToInsert.transfers = params.transfers;
    }

    let pendingTransactionFormatter = new PendingTransactionFormatter(dataToInsert),
      formatterRsp = pendingTransactionFormatter.formatDataForDdb(),
      formattedDataForDb = formatterRsp.data;

    let insertRsp = await pendingTransactionModel.putItem(formattedDataForDb);

    if (insertRsp.isFailure()) {
      return Promise.reject(insertRsp);
    }

    let PendingTransactionByUuidCache = blockScannerObj.cache.PendingTransactionByUuid,
      pendingTransactionByUuidCache = new PendingTransactionByUuidCache({
        chainId: oThis.chainId,
        transactionUuids: [transactionUuid]
      });
    // set TxUUid cache
    await pendingTransactionByUuidCache.setCache({
      [transactionUuid]: formattedDataForDb
    });

    if (transactionHash) {
      let PendingTransactionByHashCache = blockScannerObj.cache.PendingTransactionByHash;
      let pendingTransactionByHashCache = new PendingTransactionByHashCache({
        chainId: oThis.chainId,
        transactionHashes: [transactionHash]
      });
      await pendingTransactionByHashCache.setCache({
        [transactionHash]: {
          transactionUuid: transactionUuid
        }
      });
    }

    return Promise.resolve(responseHelper.successWithData(formattedDataForDb));
  }

  /**
   *
   * update by uuid
   *
   * @return {Promise<result>}
   */
  async update(dataToUpdate) {
    const oThis = this;

    // Get blockScanner object.
    const blockScannerObj = await blockScannerProvider.getInstance([oThis.chainId]);

    // Get pending transaction model
    const PendingTransactionModel = blockScannerObj.model.PendingTransaction,
      pendingTransactionModel = new PendingTransactionModel({ chainId: oThis.chainId });

    dataToUpdate['chainId'] = oThis.chainId;
    let pendingTransactionFormatter = new PendingTransactionFormatter(dataToUpdate),
      formatterRsp = pendingTransactionFormatter.formatDataForDdb(),
      formattedDataForDb = formatterRsp.data;

    let updateRsp = await pendingTransactionModel.updateItem(formattedDataForDb);

    if (updateRsp.isFailure()) {
      return Promise.reject(updateRsp);
    }

    pendingTransactionFormatter = new PendingTransactionFormatter(updateRsp.data);
    formatterRsp = pendingTransactionFormatter.formatDataFromDdb();
    let formattedDataFromDb = formatterRsp.data;

    return Promise.resolve(responseHelper.successWithData(formattedDataFromDb));
  }
}

module.exports = PendingTransactionCrud;
