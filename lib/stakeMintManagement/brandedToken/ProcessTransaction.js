'use strict';

/*
 * This file helps in handling transaction provided by FE
 */

const rootPrefix = '../../..',
  CreatePendingTransaction = require(rootPrefix + '/lib/transactions/CreatePendingTransaction'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  Base = require(rootPrefix + '/lib/stakeMintManagement/Base');

class ProcessTransaction extends Base {
  /**
   * @constructor
   *
   * @param params
   * @param params.transactionHash {String}
   * @param params.originChainId   {Number}
   *
   */
  constructor(params) {
    super(params);
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

    await oThis._setOriginWeb3Instance();

    await oThis._getTransactionDetails();

    let response = await oThis._insertPendingTransaction();

    if (response.isSuccess()) {
      return responseHelper.successWithData({ taskStatus: workflowStepConstants.taskDone });
    } else {
      return responseHelper.successWithData({ taskStatus: workflowStepConstants.taskFailed });
    }
  }

  /**
   * _getTransactionDetails
   *
   * @return {Promise<void>}
   * @private
   */
  async _getTransactionDetails() {
    const oThis = this;

    oThis.txOptions = await oThis.originWeb3.eth.getTransaction(oThis.transactionHash);
  }

  /**
   * _insertPendingTransaction
   *
   * @private
   */
  async _insertPendingTransaction() {
    const oThis = this;

    let createPendingTransaction = new CreatePendingTransaction(oThis.originChainId);

    return createPendingTransaction.insertPendingTransaction(
      oThis.txOptions,
      oThis.transactionHash,
      oThis.payloadDetails
    );
  }
}

module.exports = ProcessTransaction;
