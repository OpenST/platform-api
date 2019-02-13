'use strict';

/**
 * Transfer ST Prime
 *
 * @module lib/fund/stPrime/BatchTransfer
 */

const rootPrefix = '../../..',
  TransferStPrime = require(rootPrefix + '/lib/fund/stPrime/Transfer');

const BATCH_SIZE = 5;

class BatchTransfer {
  /**
   * @constructor
   *
   * @param {Object} params
   * @param {Integer} params.auxChainId
   * @param {Array} params.transferDetails - [{fromAddress:'', toAddress: '', amountInWei:''},{fromAddress:'', toAddress: '', amountInWei:''}]
   */
  constructor(params) {
    const oThis = this;
    oThis.auxChainId = params.auxChainId;
    oThis.transferDetails = params.transferDetails;
  }

  /**
   * perform
   *
   * @returns {Promise}
   */
  async perform() {
    const oThis = this;

    let promiseArray = [];

    for (let i = 0; i < oThis.transferDetails.length; i++) {
      let transferD = oThis.transferDetails[i];
      promiseArray.push(
        new TransferStPrime({
          auxChainId: oThis.auxChainId,
          fromAddress: transferD.fromAddress,
          toAddress: transferD.toAddress,
          amountInWei: transferD.amountInWei,
          waitTillReceipt: 1
        }).perform()
      );

      if (promiseArray.length >= BATCH_SIZE || oThis.transferDetails.length == i + 1) {
        await Promise.all(promiseArray);
        promiseArray = [];
      }
    }

    return {};
  }
}

module.exports = BatchTransfer;
