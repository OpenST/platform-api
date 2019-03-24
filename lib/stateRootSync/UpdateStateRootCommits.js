'use strict';

/**
 * Update state root commit
 *
 * @module lib/stateRootSync/UpdateStateRootCommits
 */
const MosaicAnchor = require('@openstfoundation/mosaic-anchor.js');

const rootPrefix = '../..',
  StateRootSyncBase = require(rootPrefix + '/lib/stateRootSync/Base'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CheckTxStatus = require(rootPrefix + '/lib/transactions/CheckTxStatus'),
  stateRootCommitHistoryConstants = require(rootPrefix + '/lib/globalConstant/stateRootCommit'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  StateRootCommitModel = require(rootPrefix + '/app/models/mysql/StateRootCommit');

class UpdateStateRootCommit extends StateRootSyncBase {
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.transactionHash = params.transactionHash;
  }

  /**
   * Perform
   *
   * @return {Promise<result>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error(`${__filename}::perform::catch`);
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'l_srs_usrc_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /***
   * Async performer for the class.
   *
   * @private
   *
   * @return {Promise<result>}
   */
  async _asyncPerform() {
    const oThis = this;

    let txstatus = await oThis._getTransactionStatus();

    // If transaction passed is failed or block number is not provided in input then
    // fetch last commited block height from contract

    //Rachin: Potential bug here.
    // 1. Lets say service was requested to commit state root of block #111111 
    //    and the last committed state root was of block #100000  
    // 2. Lets say the transaction failed because of insufficient ETHs
    // 3. The below code will set oThis.blockNumber = 100000 
    //    and will call _insertInStateRootCommits.
    // 4. _insertInStateRootCommits will get ER_DUP_ENTRY error
    //    which will be handled as success and resolved with affectedRows = 1.
    // 5. The workflow will complete with success. But, in reality block #111111
    //    was never committed into block-chain.
    //
    // If txstatus.isFailure() then we should NOT reset oThis.blockNumber.
    // More safer solutions can be built around this.
    //
    // Secondly, we should also consider the use-case where block #11111 failed to commit, 
    // but block higher than #11111 was committed. 

    if (txstatus.isFailure() || !oThis.blockNumber) {
      await oThis._getBlockNumberFromContract();
    }

    let response = await oThis._insertInStateRootCommits();

    if (response.affectedRows == 1) {
      return responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone,
        taskResponseData: { blockNumber: oThis.blockNumber }
      });
    } else {
      return responseHelper.successWithData({ taskStatus: workflowStepConstants.taskFailed });
    }
  }

  /**
   * Get transaction status.
   *
   * @return {Promise<void>}
   * @private
   */
  async _getTransactionStatus() {
    const oThis = this;

    let checkTxStatus = new CheckTxStatus({
      chainId: oThis.destinationChainId,
      transactionHash: oThis.transactionHash
    });

    return checkTxStatus.perform();
  }

  /**
   * Get block number.
   *
   * @return {Promise<void>}
   * @private
   */
  async _getBlockNumberFromContract() {
    const oThis = this;

    let oAnchor = await oThis._createMosaicAnchorObj();

    oThis.blockNumber = await oAnchor.getLatestStateRootBlockHeight();
  }

  /**
   * Update State Root Commits
   *
   * @return {*}
   */
  _insertInStateRootCommits() {
    const oThis = this;

    let stateRootCommitModel = new StateRootCommitModel();

    return stateRootCommitModel
      .insertStateRootCommit({
        source_chain_id: oThis.sourceChainId,
        target_chain_id: oThis.destinationChainId,
        block_number: oThis.blockNumber,
        status: stateRootCommitModel.invertedStatuses[stateRootCommitHistoryConstants.committed]
      })
      .catch(function(error) {
        if (error) {
          if (error.code === 'ER_DUP_ENTRY') {
            logger.debug('------Trying for duplicate Entry--------');
            return Promise.resolve({ affectedRows: 1 });
          }
        } else {
          logger.debug(error);
          //Rachin: Shouldn't we reject the promise here??
          return Promise.resolve({ affectedRows: 0 });
        }
      });
  }
}

module.exports = UpdateStateRootCommit;
