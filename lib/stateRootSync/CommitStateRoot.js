/**
 * Module to commit state root of chain to Anchor contract of another chain.
 *
 * @module lib/stateRootSync/CommitStateRoot
 */

const rootPrefix = '../..',
  StateRootSyncBase = require(rootPrefix + '/lib/stateRootSync/Base'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

/**
 * Class to commit state root of chain to Anchor contract of another chain.
 *
 * @class CommitStateRoot
 */
class CommitStateRoot extends StateRootSyncBase {
  /**
   * Constructor to commit state root of chain to Anchor contract of another chain.
   *
   * @param {object} params
   * @param {number} params.auxChainId: Auxiliary Chain Id with respect to which operation would happen.
   * @param {number} params.blockNumber: Block Number to sync state root for.
   * @param {number} params.sourceChainId: Source Chain Id for which state root sync is started.
   * @param {number} params.destinationChainId: Destination Chain Id where state root would be synced.
   * @param {number} [params.tokenId]: token id.
   * @param {number} params.isRetrialAttempt: Check for latest block in case of retrial attempt.
   * @param {number} params.runOnZeroGas: Run on zero Gas during first time stake and mint.
   *
   * @augments StateRootSyncBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenId = params.tokenId;
    oThis.isRetrialAttempt = params.isRetrialAttempt;
    oThis.runOnZeroGas = params.runOnZeroGas;

    oThis.payloadDetails = null;
    oThis.blockNumberToBeCommitted = null;
  }

  /**
   * Main performer of class.
   *
   * @param {object} payloadDetails: Payload data to be used after finalizer marks transaction complete.
   *
   * @sets oThis.payloadDetails
   *
   * @return {Promise<result>}
   */
  async perform(payloadDetails) {
    const oThis = this;

    oThis.payloadDetails = payloadDetails;

    const resp = await oThis._commitTransaction();

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
    }

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskFailed,
        taskResponseData: { err: JSON.stringify(resp) }
      })
    );
  }

  /**
   * Commit transaction.
   *
   * @return {Promise<*>}
   * @private
   */
  async _commitTransaction() {
    const oThis = this;

    const oAnchor = await oThis._createMosaicAnchorObj();

    await oThis._setBlockNumberToBeCommitted();

    // If block number is present then send block details to avoid confirmations wait.
    const block = await oThis.sourceWeb3.eth.getBlock(oThis.blockNumberToBeCommitted);

    // This will return transaction object to submit transaction.
    const txObject = await oAnchor._anchorStateRoot(block, oThis.txOptions);

    oThis.txOptions.data = txObject.encodeABI();

    // Override Gas price in case of run on zero gas.
    if (oThis.runOnZeroGas) {
      oThis.txOptions.gasPrice = contractConstants.zeroGasPrice;
    }

    // NOTE: We can not afford wrong block number in anchor contracts.
    if (!basicHelper.isDevelopment()) {
      if (oThis.destinationChainId == 3 || oThis.destinationChainId == 1) {
        // Ropsten.
        if (parseInt(oThis.blockNumberToBeCommitted) > 5200000) {
          const errMsg = 'Aux chain block number ' + oThis.blockNumberToBeCommitted + ' is greater than 5200000';
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
        // AUX Chain.
        if (parseInt(oThis.blockNumberToBeCommitted) < 5200000) {
          const errMsg = 'Origin chain block number ' + oThis.blockNumberToBeCommitted + ' is less than 5200000';
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

  /**
   * Set block number to committed.
   *
   * @sets oThis.blockNumberToBeCommitted
   *
   * @return {Promise<void>}
   * @private
   */
  async _setBlockNumberToBeCommitted() {
    const oThis = this;

    if (oThis.isRetrialAttempt) {
      // Fetch highest block number.
      const highestBlock = await oThis.sourceWeb3.eth.getBlock('latest');

      // Following has an assumption that retrialAttempt is called after finalization.
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
