'use strict';

/*
 * This file helps in handling transaction provided by FE
 */

const rootPrefix = '../../..',
  CreatePendingTransaction = require(rootPrefix + '/lib/transactions/CreatePendingTransaction'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  StakeAndMintBase = require(rootPrefix + '/lib/stakeAndMint/Base');

class RecordStakerTx extends StakeAndMintBase {
  /**
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.transactionHash = params.transactionHash;
    oThis.originChainId = params.originChainId;
  }

  /***
   * Async perform
   *
   * @private
   *
   * @return {Promise<result>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._setOriginWeb3Instance();

    let isTrxFinalized = await oThis._checkTransactionFinalized();

    // If transaction is already finalized by our block Scanner
    // Then mark step as done and move ahead.
    let taskStatus;

    if (isTrxFinalized) {
      taskStatus = workflowStepConstants.taskDone;
    } else {
      taskStatus = workflowStepConstants.taskPending;
      await oThis._insertPendingTransaction();
    }

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: taskStatus,
        transactionHash: oThis.transactionHash,
        taskResponseData: { chainId: oThis.originChainId, transactionHash: oThis.transactionHash }
      })
    );
  }

  /**
   * check is transaction is finalized
   *
   * @return {Promise<boolean>}
   * @private
   */
  async _checkTransactionFinalized() {
    const oThis = this;

    let isTrxFinalized = false,
      txReceipt = await oThis.originWeb3.eth.getTransactionReceipt(oThis.transactionHash);

    // Transaction is already mined.
    if (txReceipt) {
      let txBlock = txReceipt.blockNumber,
        finalizedBlock = await oThis._getLastFinalizedBlock();

      isTrxFinalized = txBlock <= finalizedBlock;
    }

    return isTrxFinalized;
  }

  /**
   * get last finalized block
   *
   * @return {Promise<number>}
   * @private
   */
  async _getLastFinalizedBlock() {
    const oThis = this;

    let blockScannerObj = await blockScannerProvider.getInstance([oThis.originChainId]),
      ChainCronDataModel = blockScannerObj.model.ChainCronData,
      chainCronDataObj = new ChainCronDataModel({}),
      cronDataRsp = await chainCronDataObj.getCronData(oThis.originChainId);

    return parseInt(cronDataRsp[oThis.originChainId]['lastFinalizedBlock']);
  }

  /**
   * _insertPendingTransaction
   *
   * @private
   */
  async _insertPendingTransaction() {
    const oThis = this;

    let txOptions = await oThis.originWeb3.eth.getTransaction(oThis.transactionHash);

    let createPendingTransaction = new CreatePendingTransaction(oThis.originChainId);

    return createPendingTransaction.insertPendingTransaction({
      transactionData: txOptions,
      transactionHash: oThis.transactionHash,
      afterReceipt: oThis.payloadDetails
    });
  }
}

module.exports = RecordStakerTx;
