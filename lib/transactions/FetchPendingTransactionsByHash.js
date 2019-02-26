'use strict';

/**
 * Module to fetch pending tx hash details
 *
 * @module lib/transactions/FetchPendingTransactionsByHash
 */

const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  PendingTransactionFormatter = require(rootPrefix + '/lib/formatter/blockScannerDdbData/PendingTransaction'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner');

class FetchPendingTransactionsByHash {
  /**
   * @constructor
   *
   * @param {Number} chainId - chainId
   * @param {Array} transactionHashes - transactionHash
   * @param {Boolean} formattingRequired
   */
  constructor(chainId, transactionHashes, formattingRequired) {
    const oThis = this;

    oThis.chainId = chainId;
    oThis.transactionHashes = transactionHashes;
    oThis.formattingRequired = formattingRequired;

    if (CommonValidators.isVarNull(oThis.formattingRequired)) {
      oThis.formattingRequired = true;
    }

    oThis.blockScanner = null;
    oThis.transactionUuids = [];
  }

  /***
   *
   * @return {Promise<*>}
   */
  async perform() {
    const oThis = this;

    await oThis._setBlockScannerInstance();

    await oThis._fetchUuidsFromTxHashes();

    return await oThis._fetchDetailsByUuid();
  }

  async _setBlockScannerInstance() {
    const oThis = this;
    oThis.blockScanner = await blockScannerProvider.getInstance([oThis.chainId]);
  }

  async _fetchUuidsFromTxHashes() {
    const oThis = this;

    let PendingTransactionByHashCache = oThis.blockScanner.cache.PendingTransactionByHash;
    let pendingTransactionByHashCache = new PendingTransactionByHashCache({
      chainId: oThis.chainId,
      transactionHashes: oThis.transactionHashes
    });

    let fetchRsp = await pendingTransactionByHashCache.fetch();
    if (fetchRsp.isFailure()) {
      return Promise.reject(fetchRsp);
    }

    let cacheData = fetchRsp.data,
      buffer,
      uuid;

    for (let txHash in cacheData) {
      buffer = cacheData[txHash];
      if (buffer) {
        uuid = buffer.transactionUuid;
        if (uuid) {
          oThis.transactionUuids.push(uuid);
        }
      }
    }
  }

  /**
   *
   * @return {Promise<result>}
   * @private
   */
  async _fetchDetailsByUuid() {
    const oThis = this;

    let PendingTransactionByUuidCache = oThis.blockScanner.cache.PendingTransactionByUuid;
    let pendingTransactionByUuidCache = new PendingTransactionByUuidCache({
      chainId: oThis.chainId,
      transactionUuids: oThis.transactionUuids
    });

    let fetchRsp = await pendingTransactionByUuidCache.fetch();
    if (fetchRsp.isFailure()) {
      return Promise.reject(fetchRsp);
    }

    if (!oThis.formattingRequired) {
      return fetchRsp;
    }

    let cacheData = fetchRsp.data,
      buffer,
      txHash,
      formattedData = {};

    for (let txUuid in cacheData) {
      buffer = cacheData[txUuid];
      if (buffer) {
        txHash = buffer.transactionHash;
        if (txHash) {
          let pendingTransactionFormatter = new PendingTransactionFormatter(buffer),
            formatterRsp = pendingTransactionFormatter.formatDataFromDdb();
          formattedData[txHash] = formatterRsp.data;
        }
      }
    }

    return responseHelper.successWithData(formattedData);
  }
}

module.exports = FetchPendingTransactionsByHash;
