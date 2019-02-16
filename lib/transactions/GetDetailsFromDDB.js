'use strict';
/**
 * This service gets the details of the transactions.
 *
 * @module lib/transactions/GetDetailsFromDDB
 */
const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner');

class GetTransactionsDetailsFromDDB {
  /**
   *
   * @param params
   * @param {Number} params.chainId: chainId
   * @param {Array} params.transactionHashes: transactionHashes
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.chainId = params.chainId;
    oThis.transactionHashes = params.transactionHashes;
  }

  /**
   * Performer
   *
   * @return {Promise<>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('lib/transactions/GetDetailsFromDDB::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'l_t_gtfd_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * asyncPerform
   *
   * @return {Promise<any>}
   */
  async asyncPerform() {
    const oThis = this;

    // If chainId is not found
    if (!oThis.chainId) {
      return responseHelper.error({
        internal_error_identifier: 'l_t_gtfd_2',
        api_error_identifier: 'missing_chain_id',
        debug_options: {}
      });
    }

    // If transaction hashes are not found
    if (!oThis.transactionHashes) {
      return responseHelper.error({
        internal_error_identifier: 'l_t_gtfd_3',
        api_error_identifier: 'something_went_wrong',
        debug_options: {}
      });
    }

    return oThis.getTransactionDetails();
  }

  /**
   * Get Transaction Details
   *
   * @return {Promise<*|result>}
   */
  async getTransactionDetails() {
    const oThis = this;

    let blockScannerObj = await blockScannerProvider.getInstance([oThis.chainId]),
      GetTransaction = blockScannerObj.transaction.Get,
      getTransactionObj = new GetTransaction(oThis.chainId, oThis.transactionHashes),
      getTransactionResponse = await getTransactionObj.perform();

    if (!getTransactionResponse.isSuccess()) {
      logger.error('Unable to fetch txReceipts from DDB.');
      return responseHelper.error({
        internal_error_identifier: 'l_t_gtfd_4',
        api_error_identifier: 'something_went_wrong',
        debug_options: {}
      });
    }

    let txHashToTxReceiptsMap = getTransactionResponse.data;

    return responseHelper.successWithData(txHashToTxReceiptsMap);
  }
}

module.exports = GetTransactionsDetailsFromDDB;
