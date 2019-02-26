'use strict';

/**
 * Run this process when any execute_transaction subscriber comes up.
 *
 * @module lib/executeTransactionManagement/InitProcess
 *
 */

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  TxCronProcessDetailsModel = require(rootPrefix + '//app/models/mysql/TxCronProcessDetail'),
  TokenExtxWorkerProcessesModel = require(rootPrefix + '/app/models/mysql/TokenExtxWorkerProcesses'),
  tokenExtxWorkerProcessesConstants = require(rootPrefix + '/lib/globalConstant/tokenExtxWorkerProcesses');

/**
 * constructor
 *
 * @param {Object} params
 * @param {Integer} params.processId - Process id that is going to start.
 *
 * @constructor
 */
class InitProcessKlass {
  constructor(params) {
    const oThis = this;
    oThis.processId = params.processId;

    oThis.shouldStartTxQueConsume = 1;
    oThis.processDetails = {};
  }

  /**
   * perform
   *
   * @return {Promise}
   */
  async perform() {
    const oThis = this;

    await oThis.getProcessDetails();

    await oThis.getHoldWorkers();

    // Check and decide process consumption.
    return Promise.resolve({
      processDetails: oThis.processDetails,
      shouldStartTxQueConsume: oThis.shouldStartTxQueConsume
    });
  }

  /**
   * Get Process Details.
   *
   * @returns {Promise<{}>}
   */
  async getProcessDetails() {
    const oThis = this;
    let cronDetails = await new TxCronProcessDetailsModel()
      .select('*')
      .where(['cron_process_id = ?', oThis.processId])
      .fire();

    oThis.processDetails['txCronProcessDetailsId'] = cronDetails[0].id;
    oThis.processDetails['chainId'] = cronDetails[0].chain_id;
    oThis.processDetails['queueTopicSuffix'] = cronDetails[0].queue_topic_suffix;
    return oThis.processDetails;
  }

  /**
   * Get all hold workers.
   *
   * @return {Promise}
   */
  async getHoldWorkers() {
    const oThis = this,
      getAllExTxHoldWorkersResp = await new TokenExtxWorkerProcessesModel()
        .select('*')
        .where([
          'tx_cron_process_detail_id = ? AND properties = properties | ?',
          oThis.processDetails['txCronProcessDetailsId'],
          tokenExtxWorkerProcessesConstants.invertedProperties[tokenExtxWorkerProcessesConstants.onHoldProperty]
        ])
        .fire();

    logger.debug('======= Workers Having property hold ======\n', getAllExTxHoldWorkersResp);

    // If the status is not onHold of given process, it shouldStartTxQueConsume.
    if (getAllExTxHoldWorkersResp.length <= 0) {
      return Promise.resolve({});
    }

    // Check if any sibling worker of token is in blocking status.
    let tokenIds = [];
    for (let i = 0; i < getAllExTxHoldWorkersResp.length; i++) {
      tokenIds.push(getAllExTxHoldWorkersResp[i].token_id);
    }

    let getAllExTxBlockingWorkersResp = await new TokenExtxWorkerProcessesModel()
      .select('*')
      .where([
        'token_id in (?) AND properties = properties | ?',
        tokenIds,
        tokenExtxWorkerProcessesConstants.invertedProperties[tokenExtxWorkerProcessesConstants.blockingProperty]
      ])
      .fire();

    logger.debug('======= Workers Having property blocking ======\n', getAllExTxBlockingWorkersResp);

    // Along with onHold of given process, if any of sibling worker is in blocking status it should not StartTxQueConsume.
    // otherwise remove onHold status, and it shouldStartTxQueConsume.

    if (getAllExTxHoldWorkersResp.length > 0 && getAllExTxBlockingWorkersResp.length > 0) {
      oThis.shouldStartTxQueConsume = 0;
    } else if (getAllExTxHoldWorkersResp.length > 0) {
      await new TokenExtxWorkerProcessesModel()
        .update([
          'properties = properties ^ ?',
          tokenExtxWorkerProcessesConstants.invertedProperties[tokenExtxWorkerProcessesConstants.onHoldProperty]
        ])
        .where([
          'tx_cron_process_detail_id = ? AND properties = properties | ? AND token_id in (?)',
          oThis.processDetails['txCronProcessDetailsId'],
          tokenExtxWorkerProcessesConstants.invertedProperties[tokenExtxWorkerProcessesConstants.onHoldProperty],
          tokenIds
        ])
        .fire();
    }

    return Promise.resolve({});
  }
}

module.exports = InitProcessKlass;
