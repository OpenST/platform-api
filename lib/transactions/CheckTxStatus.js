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
   * @param params.transactionReceipt {Object} - transactionReceipt
   */
  constructor(params) {
    const oThis = this;

    oThis.successStatus = '1';
    oThis.transactionReceipt = params.transactionReceipt;
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

    // If transactionReceipt is not found
    if (!oThis.transactionReceipt) {
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_t_cts_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return await oThis.checkTxStatus();
  }

  /**
   * compare tx status
   *
   * @return {Promise<*|result>}
   */
  async checkTxStatus() {
    const oThis = this;

    let DDBTxStatus = oThis.transactionReceipt['transactionStatus'];

    if (DDBTxStatus !== oThis.successStatus) {
      return responseHelper.error({
        internal_error_identifier: 'l_t_cts_3',
        api_error_identifier: 'something_went_wrong',
        debug_options: { txHash: oThis.transactionReceipt['transactionHash'] }
      });
    }

    return responseHelper.successWithData(DDBTxStatus);
  }

  /**
   * compare Internal status of tx
   *
   * @return {Promise<*|result>}
   */
  async checkTxInternalStatus() {
    const oThis = this;

    let DDBTxInternalStatus = oThis.transactionReceipt['transactionInternalStatus'];

    if (DDBTxInternalStatus !== oThis.successStatus) {
      return responseHelper.error({
        internal_error_identifier: 'l_t_cts_3',
        api_error_identifier: 'something_went_wrong',
        debug_options: { txHash: oThis.transactionReceipt['transactionHash'] }
      });
    }

    return responseHelper.successWithData(DDBTxInternalStatus);
  }
}

module.exports = CheckTxStatus;
