'use strict';

/**
 *
 * Insert address into token address
 * @module lib/setup/economy/InsertAddressIntoTokenAddress.js
 */

const rootPrefix = '../../..',
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  GetDetailsFromDDB = require(rootPrefix + '/lib/transactions/GetDetailsFromDDB');

class InsertAddressIntoTokenAddress {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {String} params.tokenId - id in tokens table
   * @param {String} params.kind - address kind
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

  async perform() {
    const oThis = this;

    await oThis._fetchTransactionFromView();

    await new TokenAddressModel()
      .insert({
        token_id: oThis.tokenId,
        kind: oThis.kind,
        address: oThis.address
      })
      .fire();
  }

  /***
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

    console.log(getTxDetailsRsp.toHash());
  }
}

module.exports = InsertAddressIntoTokenAddress;
