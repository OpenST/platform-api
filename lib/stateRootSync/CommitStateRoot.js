'use strict';
/**
 * Commit State root of chain to Anchor contract of another chain.
 *
 * @module lib/stateRootSync/CommitStateRoot
 */

const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  StateRootSyncBase = require(rootPrefix + '/lib/stateRootSync/Base'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain');

/**
 * Class to commit State root of chain to Anchor contract of another chain.
 *
 * @class
 */
class CommitStateRoot extends StateRootSyncBase {
  /**
   * Constructor to commit State root of chain to Anchor contract of another chain.
   *
   * @param {Object} params
   * @param {Number} params.auxChainId: Auxiliary Chain Id with respect to which operation would happen
   * @param {Number} params.blockNumber - Block Number to sync state root for
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.blockNumberToBeCommitted = null;
  }

  /**
   * Performer
   *
   * @param {Object} payloadDetails: Payload data to be used after finalizer marks transaction complete
   *
   * @return {Promise<result>}
   */
  async perform(payloadDetails) {
    const oThis = this;

    oThis.payloadDetails = payloadDetails;

    let resp = await oThis._commitTransaction();

    if (resp.isSuccess()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskPending,
          transactionHash: resp.data.transactionHash,
          taskResponseData: {
            sourceChainId: oThis.sourceChainId,
            destinationChainId: oThis.destinationChainId,
            transactionHash: resp.data.transactionHash,
            blockNumber: oThis.blockNumberToBeCommitted
          }
        })
      );
    } else {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskFailed,
          taskResponseData: { err: JSON.stringify(resp) }
        })
      );
    }
  }

  /**
   * Commit transaction .
   *
   * @return {Promise<*>}
   *
   * @private
   */
  async _commitTransaction() {
    const oThis = this;

    let oAnchor = await oThis._createMosaicAnchorObj();

    await oThis._setBlockNumberToBeCommitted();

    // If block number is present then send block details to avoid confirmations wait
    let block = await oThis.sourceWeb3.eth.getBlock(oThis.blockNumberToBeCommitted);

    // This will return transaction object to submit transaction.
    let txObject = await oAnchor._anchorStateRoot(block, oThis.txOptions);

    oThis.txOptions.data = txObject.encodeABI();

    return new SubmitTransaction({
      chainId: oThis.destinationChainId,
      provider: oThis.destinationChainUrl,
      txOptions: oThis.txOptions,
      options: oThis.payloadDetails
    }).perform();
  }

  async _setBlockNumberToBeCommitted() {
    const oThis = this;

    if (oThis.isRetrialAttempt) {
      // fetch highest block number
      let highestBlock = await oThis.sourceWeb3.eth.getBlock('latest');

      // following has an assumption that retrialAttempt is called after finalization
      if (highestBlock.number - oThis.confirmations == oThis.blockNumber) {
        oThis.blockNumberToBeCommitted = oThis.blockNumber + 1;
      } else {
        oThis.blockNumberToBeCommitted = highestBlock.number - oThis.confirmations;
      }
    } else {
      oThis.blockNumberToBeCommitted = oThis.blockNumber;
    }
  }
}

module.exports = CommitStateRoot;
