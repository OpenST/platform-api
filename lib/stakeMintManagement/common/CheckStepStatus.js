'use strict';
/**
 * Check step status.
 *
 * @module lib/stakeMintManagement/common/CheckStepStatus
 */
const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CheckTxStatus = require(rootPrefix + '/lib/transactions/CheckTxStatus'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

/**
 * Class to check step status
 *
 * @class
 */
class CheckStepStatus {
  /**
   * Constructor to check step status
   *
   * @param params
   * @param params.chainId {Number} - chainId
   * @param params.transactionHash {String} - transactionHash
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.chainId = params.chainId;
    oThis.transactionHash = params.transactionHash;
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
        logger.error('lib/workflow/CheckStepStatus::perform::catch');
        logger.error(error);

        return responseHelper.error({
          internal_error_identifier: 'l_smm_c_ccs_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * Async performer
   *
   * @return {Promise<any>}
   */
  async asyncPerform() {
    const oThis = this,
      checkTxStatus = new CheckTxStatus({ chainId: oThis.chainId, transactionHash: oThis.transactionHash }),
      response = await checkTxStatus.perform();

    let respData = { transactionHash: oThis.transactionHash, chainId: oThis.chainId };
    if (response.isSuccess()) {
      return responseHelper.successWithData({ taskStatus: workflowStepConstants.taskDone, taskResponseData: respData });
    } else {
      return responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskFailed,
        taskResponseData: respData
      });
    }
  }
}

module.exports = CheckStepStatus;
