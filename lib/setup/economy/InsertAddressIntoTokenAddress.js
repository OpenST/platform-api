'use strict';

/**
 * This module fetch transactionReceipt from ddb and inserts its respective contract Address into token address table.
 *
 * @module lib/setup/economy/InsertAddressIntoTokenAddress.js
 */

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  GetDetailsFromDDB = require(rootPrefix + '/lib/transactions/GetDetailsFromDDB');

class InsertAddressIntoTokenAddress {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Integer} params.tokenId - id in tokens table
   * @param {String} params.kind - address kind
   * @param {Integer} params.chainId - chainId
   * @param {String} params.transactionHash - transactionHash
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;
    oThis.tokenId = params.tokenId;
    oThis.kind = params.kind;
    oThis.chainId = params.chainId;
    oThis.transactionHash = params.transactionHash;
  }

  /**
   *  performer
   *
   * @returns {Promise<*>}
   */
  async perform() {
    const oThis = this;

    let TxDetailsRsp = await oThis._fetchTransactionFromView();

    await new TokenAddressModel()
      .insert({
        token_id: oThis.tokenId,
        kind: new TokenAddressModel().invertedKinds[oThis.kind],
        address: TxDetailsRsp.data[oThis.transactionHash].contractAddress
      })
      .fire();

    return Promise.resolve(
      responseHelper.successWithData({
        taskDone: 1
      })
    );
  }

  /***
   * This method extracts transactionReceipt from dynamodb
   *
   * @private
   */
  async _fetchTransactionFromView() {
    const oThis = this,
      getTxDetailsObj = new GetDetailsFromDDB({
        chainId: oThis.chainId,
        transactionHashes: [oThis.transactionHash]
      }),
      getTxDetailsRsp = await getTxDetailsObj.perform();

    if (getTxDetailsRsp.isFailure()) return Promise.reject(getTxDetailsRsp);

    return getTxDetailsRsp;
  }
}

module.exports = InsertAddressIntoTokenAddress;
