'use strict';

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  GetTransactionDetails = require(rootPrefix + '/lib/transactions/GetDetailsFromDDB'),
  CheckTxStatus = require(rootPrefix + '/lib/transactions/CheckTxStatus'),
  stateRootCommitHistoryConstants = require(rootPrefix + '/lib/globalConstant/stateRootCommit'),
  StateRootCommitModel = require(rootPrefix + '/app/models/mysql/StateRootCommit');

class StateRootCommit {
  constructor(params) {
    const oThis = this;

    oThis.sourceChainId = params.sourceChainId;
    oThis.destinationChainId = params.destinationChainId;
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

    await oThis._getTransactionStatus();

    let response = await oThis._insertInStateRootCommits();

    if (response.affectedRows == 1) {
      return responseHelper.successWithData({ taskDone: 1 });
    } else {
      return responseHelper.successWithData({ taskDone: 0 });
    }
  }

  /**
   * _getTransactionStatus
   *
   * @return {Promise<void>}
   * @private
   */
  async _getTransactionStatus() {
    const oThis = this;

    let getTransactionDetails = new GetTransactionDetails({
      chainId: oThis.destinationChainId,
      transactionHashes: [oThis.transactionHash]
    });

    let response = await getTransactionDetails.perform();

    oThis.blockNumber = response.data[oThis.transactionHash].blockNumber;

    let checkTxStatus = new CheckTxStatus({
      ddbTransaction: response.data[oThis.transactionHash]
    });

    let checkStatusResponse = await checkTxStatus.perform();

    oThis.status =
      checkStatusResponse.data == 1 ? stateRootCommitHistoryConstants.commited : stateRootCommitHistoryConstants.failed;
  }

  /**
   * updateStateRootCommits
   *
   * @return {*}
   */
  _insertInStateRootCommits() {
    const oThis = this;

    let stateRootCommitModel = new StateRootCommitModel();

    return stateRootCommitModel.insertStateRootCommit({
      source_chain_id: oThis.sourceChainId,
      target_chain_id: oThis.destinationChainId,
      block_number: oThis.blockNumber,
      status: oThis.status
    });
  }
}

module.exports = StateRootCommit;
