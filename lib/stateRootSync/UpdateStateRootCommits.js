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

    let txStatus = await oThis._getTransactionStatus(),
      successDebugParams = null;

    // If transaction passed is failed or block number is not provided in input then
    // fetch last commited block height from contract

    if (txStatus.isFailure() || !oThis.blockNumber) {
      let blockNumberFromContract = await oThis._getBlockNumberFromContract();

      //Convert into number. Make sure strings are not being compared.
      blockNumberFromContract = Number(blockNumberFromContract);

      //Rachin: Edge case: blockNumber = 0
      if (oThis.blockNumber && Number(oThis.blockNumber) > blockNumberFromContract) {
        return responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskFailed,
          debugParams: {
            blockNumberPassed: oThis.blockNumber,
            latestStateRootBlockHeightFromContract: blockNumberFromContract,
            Msg: 'State root commit failed and block number passed is greater than latest state root block height.'
          }
        });
      } else {
        //Commit state-root Transaction failed, but, we have state root of higher block.
        //The workflow can be continued with higher block number.
        successDebugParams = {
          blockNumberPassed: oThis.blockNumber,
          latestStateRootBlockHeightFromContract: blockNumberFromContract,
          Msg:
            'Commit State Root Transaction failed, but, latest state root block height is greater than or equal to the block number passed to the workflow.'
        };
        oThis.blockNumber = blockNumberFromContract;
      }
    }

    let response = await oThis._insertInStateRootCommits();

    if (response.affectedRows == 1) {
      return responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone,
        taskResponseData: { lastCommittedBlockNumber: oThis.blockNumber },
        debugParams: successDebugParams
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

    return oAnchor.getLatestStateRootBlockHeight();
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
