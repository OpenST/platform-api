'use strict';
/**
 * Module to verify token holder is set as internal actor in UBT or not.
 *
 * @module lib/setup/user/verifyInternalActorInUBTTrx
 */

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CheckTxStatus = require(rootPrefix + '/lib/transactions/CheckTxStatus'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

/**
 * Class to verify token holder is set as internal actor transaction status
 *
 * @class
 */
class VerifyInternalActorInUBTTrx {
  /**
   * Constructor to verify token holder is set as internal actor transaction status
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

    return responseHelper.successWithData({
      taskStatus: workflowStepConstants.taskFailed
    });

    // if (!oThis.transactionHash) {
    //   return responseHelper.successWithData({
    //     taskStatus: workflowStepConstants.taskFailed
    //   });
    // }
    //
    // let txSuccessRsp = await new CheckTxStatus({
    //   chainId: oThis.chainId,
    //   transactionHash: oThis.transactionHash
    // }).perform();
    //
    // if (txSuccessRsp.isFailure()) return Promise.reject(txSuccessRsp);
    //
    // return responseHelper.successWithData({
    //   taskStatus: workflowStepConstants.taskDone
    // });
  }
}

module.exports = VerifyInternalActorInUBTTrx;
