'use strict';

/**
 * This service compares tx status with response of Tx Details obtained from GetDetailsFromDDB service.
 *
 * @module lib/transactions/CheckTxStatus
 */

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  GetDetailsFromDDB = require(rootPrefix + '/lib/transactions/GetDetailsFromDDB'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

class CheckTxStatus {
  /**
   * @constructor
   *
   * @param params
   * @param params.ddbTransaction {Object} - Transaction from dynamo db
   *            OR
   * @param params.chainId {Number} - chainId
   * @param params.transactionHash {String} - transactionHash
   */
  constructor(params) {
    const oThis = this;

    oThis.successStatus = '1';
    oThis.ddbTransaction = params.ddbTransaction;
    oThis.chainId = params.chainId;
    oThis.transactionHash = params.transactionHash;
  }

  /**
   * perform
   * @return {Promise<>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('lib/transactions/CheckTxStatus::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'l_t_cts_1',
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

    // If transaction dynamo db object is not passed and transaction hash is present then query from dynamo
    if (!oThis.ddbTransaction && oThis.chainId && oThis.transactionHash) {
      let gtdKlass = new GetDetailsFromDDB({ chainId: oThis.chainId, transactionHashes: [oThis.transactionHash] }),
        dbResponse = await gtdKlass.perform();

      if (dbResponse.isSuccess()) {
        oThis.ddbTransaction = dbResponse.data[oThis.transactionHash];
      }
    }

    // If Transaction is not found in ddb.
    if (!oThis.ddbTransaction || Object.keys(oThis.ddbTransaction).length <= 0) {
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_t_cts_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return oThis.checkTxStatus();
  }

  /**
   * compare tx status
   *
   * @return {Promise<*|result>}
   */
  async checkTxStatus() {
    const oThis = this;

    let DDBTxStatus = oThis.ddbTransaction['transactionStatus'];

    if (DDBTxStatus !== oThis.successStatus) {
      return responseHelper.error({
        internal_error_identifier: 'l_t_cts_3',
        api_error_identifier: 'something_went_wrong',
        debug_options: { txHash: oThis.ddbTransaction['transactionHash'] }
      });
    }

    return responseHelper.successWithData();
  }

  /**
   * compare Internal status of tx
   *
   * @return {Promise<*|result>}
   */
  async checkTxInternalStatus() {
    const oThis = this;

    let DDBTxInternalStatus = oThis.ddbTransaction['transactionInternalStatus'];

    if (DDBTxInternalStatus !== oThis.successStatus) {
      return responseHelper.error({
        internal_error_identifier: 'l_t_cts_3',
        api_error_identifier: 'something_went_wrong',
        debug_options: { txHash: oThis.ddbTransaction['transactionHash'] }
      });
    }

    return responseHelper.successWithData(DDBTxInternalStatus);
  }
}

module.exports = CheckTxStatus;
