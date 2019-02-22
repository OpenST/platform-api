'use strict';

/**
 * Module to fetch pending tx hash details
 *
 * @module lib/transactions/FetchPendingTransactionsByUuid
 */

const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  PendingTransactionFormatter = require(rootPrefix + '/lib/formatter/blockScannerDdbData/PendingTransaction'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner');

class FetchPendingTransactionsByUuid {
  /**
   * @constructor
   *
   * @param {Number} chainId - chainId
   * @param {Array} transactionUuids - transactionUuids
   */
  constructor(chainId, transactionUuids, formattingRequired) {
    const oThis = this;

    oThis.chainId = chainId;
    oThis.transactionUuids = transactionUuids;

    oThis.formattingRequired = formattingRequired;

    if (CommonValidators.isVarNull(oThis.formattingRequired)) {
      oThis.formattingRequired = true;
    }

    oThis.blockScanner = null;
  }

  /***
   *
   * @return {Promise<*>}
   */
  async perform() {
    const oThis = this;

    await oThis._setBlockScannerInstance();

    return await oThis._fetchDetailsByUuid();
  }

  async _setBlockScannerInstance() {
    const oThis = this;
    oThis.blockScanner = await blockScannerProvider.getInstance([oThis.chainId]);
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
      formattedData = {};

    for (let txUuid in cacheData) {
      buffer = cacheData[txUuid];
      if (buffer) {
        let pendingTransactionFormatter = new PendingTransactionFormatter(buffer),
          formatterRsp = pendingTransactionFormatter.formatDataFromDdb();
        formattedData[txUuid] = formatterRsp.data;
      }
    }

    return responseHelper.successWithData(formattedData);
  }
}

module.exports = FetchPendingTransactionsByUuid;
