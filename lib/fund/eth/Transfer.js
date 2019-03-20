'use strict';

/**
 * Transfer ETH
 *
 * @module lib/fund/eth/Transfer
 */
const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  FundEthBase = require(rootPrefix + '/lib/fund/eth/Base');

/**
 * Class to transfer eth
 *
 * @class
 */
class TransferEth extends FundEthBase {
  /**
   * Constructor
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.toAddress = params.toAddress;
    oThis.fromAddress = params.fromAddress;
    oThis.amountInWei = params.amountInWei;
    oThis.waitTillReceipt = params.waitTillReceipt;
    oThis.pendingTransactionExtraData = params.pendingTransactionExtraData;
    oThis.tokenId = params.tokenId;
    oThis.pendingTransactionKind = params.pendingTransactionKind;
  }

  /**
   * perform transfers
   *
   * @return {Promise<*>}
   * @private
   */
  async _performTransfers() {
    const oThis = this;

    let fundAddressResponse = await oThis._fundAddressWithEth(oThis.fromAddress, oThis.toAddress, oThis.amountInWei, {
      waitTillReceipt: oThis.waitTillReceipt,
      pendingTransactionExtraData: oThis.pendingTransactionExtraData,
      tokenId: oThis.tokenId,
      pendingTransactionKind: oThis.pendingTransactionKind
    });

    return responseHelper.successWithData({
      transactionHash: fundAddressResponse.data.transactionHash,
      txOptions: oThis.txOptions
    });
  }
}

module.exports = TransferEth;
