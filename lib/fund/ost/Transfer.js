/**
 * Module to transfer OST.
 *
 * @module lib/fund/ost/Transfer
 */
const rootPrefix = '../../..',
  FundOstBase = require(rootPrefix + '/lib/fund/ost/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class to transfer ost.
 *
 * @class TransferOst
 */
class TransferOst extends FundOstBase {
  /**
   * Constructor to transfer ost.
   *
   * @param {object} params
   * @param {number} params.originChainId
   * @param {string} params.toAddress
   * @param {string} params.fromAddress
   * @param {string} params.amountInWei
   * @param {number} params.waitTillReceipt
   * @param {object} params.pendingTransactionExtraData
   * @param {number} params.tokenId
   * @param {string} params.pendingTransactionKind
   *
   * @augments FundOstBase
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
   * Perform transfers.
   *
   * @return {Promise<*>}
   * @private
   */
  async _performTransfers() {
    const oThis = this;

    const fundAddressResponse = await oThis._fundAddressWithOst(oThis.fromAddress, oThis.toAddress, oThis.amountInWei, {
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

module.exports = TransferOst;
