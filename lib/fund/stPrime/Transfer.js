'use strict';

/**
 * Transfer ST Prime
 *
 * @module lib/fund/stPrime/Transfer
 */
const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  FundSTPrimeBase = require(rootPrefix + '/lib/fund/stPrime/Base');

/**
 * Class to transfer ST Prime
 *
 * @class
 */
class TransferSTPrime extends FundSTPrimeBase {
  /**
   * Constructor
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.fromAddress = params.fromAddress;
    oThis.toAddress = params.toAddress;
    oThis.amountInWei = params.amountInWei;
    oThis.waitTillReceipt = params.waitTillReceipt;
    oThis.pendingTransactionExtraData = params.pendingTransactionExtraData;
  }

  /**
   * perform transfers
   *
   * @return {Promise<*>}
   * @private
   */
  async _performTransfers() {
    const oThis = this;

    let response = await oThis._fundAddressWithSTPrime(oThis.fromAddress, oThis.toAddress, oThis.amountInWei, {
      waitTillReceipt: oThis.waitTillReceipt,
      pendingTransactionExtraData: oThis.pendingTransactionExtraData
    });

    return responseHelper.successWithData({
      transactionHash: response.data.transactionHash,
      txOptions: oThis.txOptions
    });
  }
}

module.exports = TransferSTPrime;
