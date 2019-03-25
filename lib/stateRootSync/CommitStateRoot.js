'use strict';
/**
 * Commit State root of chain to Anchor contract of another chain.
 *
 * @module lib/stateRootSync/CommitStateRoot
 */

const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  StateRootSyncBase = require(rootPrefix + '/lib/stateRootSync/Base'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
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
   * @param {Number} params.sourceChainId: Source Chain Id for which state root sync is started.
   * @param {Number} params.destinationChainId: Destination Chain Id where state root would be synced.
   *
   * @param {Number} [params.tokenId] - token id
   * @param {Number} params.isRetrialAttempt - Check for latest block in case of retrial attempt.
   * @param {Number} params.runOnZeroGas - Run on zero Gas during first time stake and mint.
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenId = params.tokenId;

    oThis.blockNumberToBeCommitted = null;
    oThis.isRetrialAttempt = params.isRetrialAttempt;
    oThis.runOnZeroGas = params.runOnZeroGas;
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

    // Override Gas price in case of run on zero gas
    if (oThis.runOnZeroGas) {
      oThis.txOptions.gasPrice = contractConstants.zeroGasPrice;
    }

    // NOTE: We can not afford wrong blocknumber in anchor contracts
    if (!basicHelper.isDevelopment()) {
      if (oThis.destinationChainId == 3 || oThis.destinationChainId == 1) {
        // Ropsten
        if (parseInt(oThis.blockNumberToBeCommitted) > 5200000) {
          let errMsg = 'Aux chain block number ' + oThis.blockNumberToBeCommitted + ' is greater than 5200000';
          logger.error(errMsg);
          return Promise.reject(
            responseHelper.error({
              internal_error_identifier: 'l_srs_csr_1',
              api_error_identifier: 'something_went_wrong',
              debug_options: {
                errMsg: errMsg
              }
            })
          );
        }
      } else {
        //AUX Chain
        if (parseInt(oThis.blockNumberToBeCommitted) < 5200000) {
          let errMsg = 'Origin chain block number ' + oThis.blockNumberToBeCommitted + ' is less than 5200000';
          logger.error(errMsg);
          return Promise.reject(
            responseHelper.error({
              internal_error_identifier: 'l_srs_csr_2',
              api_error_identifier: 'something_went_wrong',
              debug_options: {
                errMsg: errMsg
              }
            })
          );
        }
      }
    }

    return new SubmitTransaction({
      chainId: oThis.destinationChainId,
      tokenId: oThis.tokenId,
      pendingTransactionKind: pendingTransactionConstants.commitStateRootKind,
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
      if (highestBlock.number - oThis.confirmations <= oThis.blockNumber) {
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
