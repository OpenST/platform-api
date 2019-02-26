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
  CronProcessesModel = require(rootPrefix + '/app/models/mysql/CronProcesses'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  TokenExtxWorkerProcessesModel = require(rootPrefix + '/app/models/mysql/TokenExtxWorkerProcesses'),
  TxCronProcessDetailsModel = require(rootPrefix + '//app/models/mysql/TxCronProcessDetail'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress');

/**
 * Class to execute transaction workers.
 *
 * @class GenerateExTxWorker
 */
class GenerateExTxWorker {
  /**
   * constructor
   * @param {object} params
   * @param {object} params.tokenId - token id
   * @param {object} params.auxChainId - aux chain id.
   */
  constructor(params) {
    const oThis = this;
    oThis.tokenId = params.tokenId;
    oThis.auxChainId = params.auxChainId;
    oThis.noOfWorkers = params.noOfWorkers || coreConstants.TX_WORKER_COUNT;

    oThis.tokenAddressIds = [];
  }

  /**
   * Async performer method.
   *
   * @returns {Promise<void>}
   * @private
   *
   */
  async perform() {
    const oThis = this;

    let addressKindToValueMap = {};

    for (let index = 0; index < oThis.noOfWorkers; index++) {
      let generateEthAddress = new GenerateTokenAddress({
          tokenId: oThis.tokenId,
          addressKind: tokenAddressConstants.txWorkerAddressKind,
          chainId: oThis.auxChainId
        }),
        response = await generateEthAddress.perform();

      if (response.isFailure()) {
        logger.error('====== Address generation failed ====== ', response);
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'l_etm_getw_1',
            api_error_identifier: 'something_went_wrong',
            debug_options: { err: 'Address generation failed' }
          })
        );
      }

      oThis.tokenAddressIds.push(response.data.tokenAddressId);
      Object.assign(addressKindToValueMap, response.data);
    }

    await oThis.assignRunningProcessToWorkers();

    return responseHelper.successWithData({
      taskStatus: workflowStepConstants.taskDone,
      debugParams: {
        tokenAddressIds: oThis.tokenAddressIds
      }
    });
  }

  /**
   * assign running execute transaction cron to transaction worker.
   *
   * @returns {Promise}
   */
  async assignRunningProcessToWorkers() {
    const oThis = this;

    let txCronProcessDetails = [],
      cronProcessIds = [];

    let runningExProcesses = await new CronProcessesModel()
      .select('*')
      .where({
        kind: new CronProcessesModel().invertedKinds[cronProcessesConstants.executeTransaction],
        status: new CronProcessesModel().invertedStatuses[cronProcessesConstants.runningStatus]
      })
      .fire();

    for (let i = 0; i < runningExProcesses.length; i++) {
      cronProcessIds.push(runningExProcesses[i].id);
    }

    if (runningExProcesses.length > 0) {
      txCronProcessDetails = await new TxCronProcessDetailsModel()
        .select('*')
        .where(['cron_process_id in (?)', cronProcessIds])
        .fire();
    }

    let noOfWorkersToBind = Math.min(txCronProcessDetails.length, oThis.tokenAddressIds.length);
    for (let i = 0; i < noOfWorkersToBind; i++) {
      await new TokenExtxWorkerProcessesModel()
        .update(['tx_cron_process_detail_id = ?', txCronProcessDetails[i].id])
        .where(['token_id = ? AND tx_cron_process_detail_id IS NULL', oThis.tokenId])
        .limit(1)
        .fire();
    }

    return true;
  }
}

module.exports = GenerateExTxWorker;
