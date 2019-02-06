'use strict';
/**
 *
 * This module generates execute transaction workers.
 *
 * @module lib/excuteTransactionManagement/GenerateExTxWorker
 */
const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  GenerateTokenAddress = require(rootPrefix + '/lib/generateKnownAddress/Token'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress');

/**
 * Class to execute transaction workers.
 *
 * @class GenerateExTxWorker
 */
class GenerateExTxWorker {
  constructor(params) {
    const oThis = this;
    oThis.tokenId = params.tokenId;
    oThis.chainId = params.chainId;
  }

  /**
   * Main Performer method.
   *
   * @returns {Promise<void>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      logger.error(' In catch block of lib/executeTransactionManagement/GenerateExTxWorker.js');

      return responseHelper.error({
        internal_error_identifier: 'l_etm_getw_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: err
      });
    });
  }

  /**
   * Async performer method.
   *
   * @returns {Promise<void>}
   * @private
   *
   */
  async asyncPerform() {
    const oThis = this;

    let addressKindToValueMap = {};

    for (let index = 0; index < coreConstants.txWorkerCount; index++) {
      let generateEthAddress = new GenerateTokenAddress({
          tokenId: oThis.tokenId,
          addressKind: tokenAddressConstants.txWorkerAddressKind,
          chainId: oThis.auxChainId
        }),
        response = await generateEthAddress.perform();

      if (response.isFailure()) {
        logger.error('====== Address generation failed ====== ', response);
      }

      Object.assign(addressKindToValueMap, response.data);
    }

    return responseHelper.successWithData({
      taskStatus: workflowStepConstants.taskDone,
      taskResponseData: addressKindToValueMap
    });
  }
}

module.exports = GenerateExTxWorker;
