'use strict';

/**
 * Run this process when any execute_transaction subscriber comes up.
 *
 * @module lib/executeTransactionManagement/InitProcess
 *
 */

const rootPrefix = '../..',
  TxCronProcessDetailsModel = require(rootPrefix + '/app/models/mysql/TxCronProcessDetail'),
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
class InitExTxExecutableProcess {
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

    await oThis._getProcessDetails();

    await oThis._getHoldWorkers();

    // Check and decide process consumption.
    return Promise.resolve({
      processDetails: oThis.processDetails,
      shouldStartTxQueConsume: oThis.shouldStartTxQueConsume
    });
  }

  /**
   * Get Process Details.
   * @return {Promise<void>}
   */
  async _getProcessDetails() {
    const oThis = this;
    let cronDetails = await new TxCronProcessDetailsModel()
      .select('*')
      .where(['cron_process_id = ?', oThis.processId])
      .fire();

    oThis.processDetails['txCronProcessDetailsId'] = cronDetails[0].id;
    oThis.processDetails['chainId'] = cronDetails[0].chain_id;
    oThis.processDetails['queueTopicSuffix'] = cronDetails[0].queue_topic_suffix;
  }

  /**
   * Get all hold workers.
   *
   * @return {Promise}
   */
  async _getHoldWorkers() {
    const oThis = this;

    // fetch all rows which are on hold and associated with the cron process id
    const onHoldResponse = await new TokenExtxWorkerProcessesModel()
      .select('*')
      .where([
        'tx_cron_process_detail_id = ? AND properties = properties | ?',
        oThis.processDetails['txCronProcessDetailsId'],
        tokenExtxWorkerProcessesConstants.invertedProperties[tokenExtxWorkerProcessesConstants.onHoldProperty]
      ])
      .fire();

    // If no rows found on hold, nothing to do. Consumption should start normally.
    if (onHoldResponse.length <= 0) {
      return Promise.resolve();
    }

    // Collect token ids for rows found on hold
    let tokenIds = [];
    for (let i = 0; i < onHoldResponse.length; i++) {
      tokenIds.push(onHoldResponse[i].token_id);
    }

    // For these token ids, check if certain rows are in blocking status.
    let blockingResponse = await new TokenExtxWorkerProcessesModel()
      .select('*')
      .where([
        'token_id in (?) AND properties = properties | ?',
        tokenIds,
        tokenExtxWorkerProcessesConstants.invertedProperties[tokenExtxWorkerProcessesConstants.blockingProperty]
      ])
      .fire();

    // if on hold and blocking rows found, then can't start consumption
    if (onHoldResponse.length > 0 && blockingResponse.length > 0) {
      oThis.shouldStartTxQueConsume = 0;
      return Promise.resolve();
    }

    // if on hold found, but no blocking rows found, then reset the on hold property. Consumption should start normally.
    if (onHoldResponse.length > 0) {
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
  }
}

module.exports = InitExTxExecutableProcess;
