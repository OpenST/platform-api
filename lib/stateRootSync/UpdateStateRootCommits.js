/**
 * Module to update state root commit.
 *
 * @module lib/stateRootSync/UpdateStateRootCommits
 */

const rootPrefix = '../..',
  StateRootSyncBase = require(rootPrefix + '/lib/stateRootSync/Base'),
  CheckTxStatus = require(rootPrefix + '/lib/transactions/CheckTxStatus'),
  StateRootCommitModel = require(rootPrefix + '/app/models/mysql/StateRootCommit'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  stateRootCommitHistoryConstants = require(rootPrefix + '/lib/globalConstant/stateRootCommit');

/**
 * Class to update state root commit.
 *
 * @class UpdateStateRootCommit
 */
class UpdateStateRootCommit extends StateRootSyncBase {
  /**
   * Constructor to update state root commit.
   *
   * @param {object} params
   * @param {number} params.auxChainId: Auxiliary Chain Id with respect to which operation would happen.
   * @param {number} params.blockNumber: Block Number to sync state root for.
   * @param {number} params.sourceChainId: Source Chain Id for which state root sync is started.
   * @param {number} params.destinationChainId: Destination Chain Id where state root would be synced.
   * @param {string} params.transactionHash: Transaction hash.
   *
   * @augments StateRootSyncBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.transactionHash = params.transactionHash;
  }

  /**
   * Main performer for class.
   *
   * @return {Promise<result>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      }
      logger.error(`${__filename}::perform::catch`);
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 'l_srs_usrc_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    });
  }

  /**
   * Async perform.
   *
   * @return {Promise<result>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    const txStatus = await oThis._getTransactionStatus();

    let successDebugParams = null;

    /* If transaction passed is failed or block number is not provided in input then
    fetch last committed block height from contract.
    */

    if (txStatus.isFailure() || !oThis.blockNumber) {
      let blockNumberFromContract = await oThis._getBlockNumberFromContract();

      // Convert into number. Make sure strings are not being compared.
      blockNumberFromContract = Number(blockNumberFromContract);

      // Rachin: Edge case: blockNumber = 0
      if (oThis.blockNumber && Number(oThis.blockNumber) > blockNumberFromContract) {
        return responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskFailed,
          debugParams: {
            blockNumberPassed: oThis.blockNumber,
            latestStateRootBlockHeightFromContract: blockNumberFromContract,
            Msg: 'State root commit failed and block number passed is greater than latest state root block height.'
          }
        });
      }
      // Commit state-root Transaction failed, but, we have state root of higher block.
      // The workflow can be continued with higher block number.
      successDebugParams = {
        blockNumberPassed: oThis.blockNumber,
        latestStateRootBlockHeightFromContract: blockNumberFromContract,
        Msg:
          'Commit State Root Transaction failed, but, latest state root block height is greater than or equal to the block number passed to the workflow.'
      };

      oThis.blockNumber = blockNumberFromContract;
    }

    const response = await oThis._insertInStateRootCommits();

    if (response.affectedRows == 1) {
      return responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone,
        taskResponseData: { lastCommittedBlockNumber: oThis.blockNumber },
        debugParams: successDebugParams
      });
    }

    return responseHelper.successWithData({ taskStatus: workflowStepConstants.taskFailed });
  }

  /**
   * Get transaction status.
   *
   * @return {Promise<void>}
   * @private
   */
  async _getTransactionStatus() {
    const oThis = this;

    const checkTxStatus = new CheckTxStatus({
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

    const oAnchor = await oThis._createMosaicAnchorObj();

    return oAnchor.getLatestStateRootBlockHeight();
  }

  /**
   * Update state root commits.
   *
   * @return {*}
   */
  _insertInStateRootCommits() {
    const oThis = this;

    const stateRootCommitModel = new StateRootCommitModel();

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

          // Rachin: Shouldn't we reject the promise here??
          return Promise.resolve({ affectedRows: 0 });
        }
      });
  }
}

module.exports = UpdateStateRootCommit;
