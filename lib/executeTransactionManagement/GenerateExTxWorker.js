'use strict';
/**
 *
 * This class has 2 responsibilities:
 * 1. Generate worker addresses and add them to token address table
 * 2. Assign worker addresses to execute transaction processes
 *
 * @module lib/excuteTransactionManagement/GenerateExTxWorker
 */
const rootPrefix = '../..',
  CronProcessesModel = require(rootPrefix + '/app/models/mysql/CronProcesses'),
  GenerateTokenAddress = require(rootPrefix + '/lib/generateKnownAddress/Token'),
  TxCronProcessDetailsModel = require(rootPrefix + '//app/models/mysql/TxCronProcessDetail'),
  TokenExtxWorkerProcessesModel = require(rootPrefix + '/app/models/mysql/TokenExtxWorkerProcesses'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

/**
 * Class to execute transaction workers.
 *
 * @class GenerateExTxWorker
 */
class GenerateExTxWorker {
  /**
   * constructor
   * @param params {object}
   * @param params.tokenId {object} - token id
   * @param params.auxChainId {object} - aux chain id
   * @param [params.noOfWorkers] {number} - number of workers - defaults to 5
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

    await oThis._generateTxWorkers();

    await oThis._assignTxWorkersToProcesses();

    return responseHelper.successWithData({
      taskStatus: workflowStepConstants.taskDone,
      debugParams: {
        tokenAddressIds: oThis.tokenAddressIds
      }
    });
  }

  /**
   * Generate Tx Worker Addresses and insert in token addresses
   *
   * @return {Promise<never>}
   * @private
   */
  async _generateTxWorkers() {
    const oThis = this;

    for (let index = 0; index < oThis.noOfWorkers; index++) {
      let generateTokenAddr = new GenerateTokenAddress({
          tokenId: oThis.tokenId,
          addressKind: tokenAddressConstants.txWorkerAddressKind,
          chainId: oThis.auxChainId
        }),
        generateTokenAddrResp = await generateTokenAddr.perform();

      if (generateTokenAddrResp.isFailure()) {
        logger.error('====== Address generation failed ====== ', generateTokenAddrResp);
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'l_etm_getw_1',
            api_error_identifier: 'something_went_wrong',
            debug_options: { err: 'Address generation failed' }
          })
        );
      }

      oThis.tokenAddressIds.push(generateTokenAddrResp.data.tokenAddressId);
    }
  }

  /**
   * assign running execute transaction cron to transaction worker.
   *
   * @returns {Promise}
   */
  async _assignTxWorkersToProcesses() {
    const oThis = this,
      thresholdForInactive = 3600;

    let txCronProcessDetails = [],
      cronProcessIds = [];

    let invertedRunningStatus = new CronProcessesModel().invertedStatuses[cronProcessesConstants.runningStatus],
      invertedStoppedStatus = new CronProcessesModel().invertedStatuses[cronProcessesConstants.stoppedStatus];

    // Fetching all running OR stopped cron processes of execute transaction
    let cronProcesses = await new CronProcessesModel()
      .select('*')
      .where([
        'kind = ? AND status in (?)',
        new CronProcessesModel().invertedKinds[cronProcessesConstants.executeTransaction],
        [invertedRunningStatus, invertedStoppedStatus]
      ])
      .fire();

    let currentTimeInSecs = Math.floor(Date.now() / 1000);

    for (let i = 0; i < cronProcesses.length; i++) {
      let cronProcess = cronProcesses[i],
        lastEndedAtInSecs = Math.floor(new Date(cronProcess.last_ended_at).getTime() / 1000);

      let notRunning = !(cronProcess.status == invertedRunningStatus);

      // Skip if cron process is not running and ended before 1 hr.
      if (notRunning && lastEndedAtInSecs + thresholdForInactive < currentTimeInSecs) {
        continue;
      }

      cronProcessIds.push(cronProcesses[i].id);
    }

    if (cronProcessIds.length > 0) {
      txCronProcessDetails = await new TxCronProcessDetailsModel()
        .select('*')
        .where(['cron_process_id in (?)', cronProcessIds])
        .fire();
    }

    let noOfWorkersToBind = Math.min(txCronProcessDetails.length, oThis.tokenAddressIds.length);

    let promiseArray = [];

    for (let i = 0; i < noOfWorkersToBind; i++) {
      promiseArray.push(
        new TokenExtxWorkerProcessesModel()
          .update(['tx_cron_process_detail_id = ?', txCronProcessDetails[i].id])
          .where(['token_id = ? AND tx_cron_process_detail_id IS NULL', oThis.tokenId])
          .limit(1)
          .fire()
      );
    }

    await Promise.all(promiseArray);

    return true;
  }
}

module.exports = GenerateExTxWorker;
