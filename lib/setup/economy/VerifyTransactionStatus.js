'use strict';
/**
 * Verify transaction status.
 *
 * @module lib/setup/economy/VerifyTransactionStatus
 */
const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CheckTxStatus = require(rootPrefix + '/lib/transactions/CheckTxStatus'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

/**
 * Class to verify transaction status
 *
 * @class
 */
class VerifyTransactionStatus {
  /**
   * Constructor to verify transaction status
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
    console.log('======oThis.chainId======', oThis.chainId);
  }

  /**
   *  performer
   *
   * @returns {Promise<*>}
   */
  async perform() {
    const oThis = this;

    if (!oThis.transactionHash) {
      return responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone
      });
    }

    let txSuccessRsp = await new CheckTxStatus({
      chainId: oThis.chainId,
      transactionHash: oThis.transactionHash
    }).perform();

    if (txSuccessRsp.isFailure()) return Promise.reject(txSuccessRsp);

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone
      })
    );
  }
}

module.exports = VerifyTransactionStatus;
