/**
 * Module to transfer Erc20 tokens.
 *
 * @module lib/fund/erc20/Transfer
 */

const rootPrefix = '../../..',
  FundErc20Base = require(rootPrefix + '/lib/fund/erc20/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class to transfer Erc20 tokens.
 *
 * @class TransferErc20
 */
class TransferErc20 extends FundErc20Base {
  /**
   * Constructor to transfer Erc20 tokens.
   *
   * @param {object} params
   * @param {number} params.originChainId
   * @param {string} params.toAddress
   * @param {string} params.fromAddress
   * @param {string} params.amountInWei
   * @param {number} params.waitTillReceipt
   * @param {object} params.pendingTransactionExtraData
   * @param {number} params.tokenId
   * @param {number} params.tokenSymbol
   * @param {string} params.pendingTransactionKind
   *
   * @augments FundErc20Base
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

    const fundAddressResponse = await oThis._fundAddressWithErc20(
      oThis.fromAddress,
      oThis.toAddress,
      oThis.amountInWei,
      {
        waitTillReceipt: oThis.waitTillReceipt,
        pendingTransactionExtraData: oThis.pendingTransactionExtraData,
        tokenId: oThis.tokenId,
        pendingTransactionKind: oThis.pendingTransactionKind
      }
    );

    return responseHelper.successWithData({
      transactionHash: fundAddressResponse.data.transactionHash,
      txOptions: oThis.txOptions
    });
  }
}

module.exports = TransferErc20;
