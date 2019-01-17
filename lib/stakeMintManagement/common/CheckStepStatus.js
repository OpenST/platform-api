'use strict';

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CheckTxStatus = require(rootPrefix + '/lib/transactions/CheckTxStatus');

class CheckStepStatus {
  /**
   * @constructor
   *
   * @param params
   * @param params.chainId {Number} - chainId
   * @param params.transactionHash {String} - transactionHash
   */
  constructor(params) {
    const oThis = this;

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
        logger.error('lib/workflow/CheckStepStatus::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'l_w_css_1',
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

    let checkTxStatus = new CheckTxStatus({ chainId: oThis.chainId, transactionHash: oThis.transactionHash });

    let response = await checkTxStatus.perform();

    if (response.isSuccess()) {
      return responseHelper.successWithData({ taskDone: 1 });
    } else {
      return responseHelper.successWithData({ taskDone: -1 });
    }
  }
}

module.exports = CheckStepStatus;
