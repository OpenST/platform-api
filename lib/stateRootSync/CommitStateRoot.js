'use strict';
/**
 * Commit State root of chain to Anchor contract of another chain.
 *
 * @module lib/stateRootSync/CommitStateRoot
 */

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
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
   * @param {Number} params.fromOriginToAux: Flag to determine whether state root has to be committed from Origin to Aux OR Aux to Origin.
   * @param {Number} params.blockNumber - Block Number to sync state root for
   *
   * @constructor
   */
  constructor(params) {
    super(params);
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
            blockNumber: oThis.blockNumber
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

    // Get last anchored state-root block height
    oAnchor.getLatestStateRootBlockHeight().then(function(blockHeight) {
      logger.log('blockHeight', blockHeight);
    });

    // If block number is present then send block details to avoid confirmations wait
    let block = null;
    if (oThis.blockNumber) {
      block = await oThis.sourceWeb3.eth.getBlock(oThis.blockNumber);
    }

    // This will return transaction object to submit transaction.
    let txObject = await oAnchor._anchorStateRoot(block, oThis.txOptions);

    oThis.txOptions['data'] = txObject.encodeABI();

    return new SubmitTransaction({
      chainId: oThis.destinationChainId,
      provider: oThis.destinationChainUrl,
      txOptions: oThis.txOptions,
      options: oThis.payloadDetails
    }).perform();
  }
}

module.exports = CommitStateRoot;
