'use strict';

/**
 *
 * @module lib/setup/economy/VerifyTransactionStatus
 */

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CheckTxStatus = require(rootPrefix + '/lib/transactions/CheckTxStatus');

class VerifyTransactionStatus {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Integer} params.chainId - chainId
   * @param {String} params.transactionHash - transactionHash
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;
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

    let txSuccessRsp = await new CheckTxStatus({
      chainId: oThis.chainId,
      transactionHash: oThis.transactionHash
    }).perform();

    if (txSuccessRsp.isFailure()) return Promise.reject(txSuccessRsp);

    return Promise.resolve(
      responseHelper.successWithData({
        taskDone: 1
      })
    );
  }
}

module.exports = VerifyTransactionStatus;
