'use strict';

/**
 *
 * @module lib/setup/economy/PostRegisterPricerRule
 */

const rootPrefix = '../../..',
  GetDetailsFromDDB = require(rootPrefix + '/lib/transactions/GetDetailsFromDDB'),
  CheckTxStatus = require(rootPrefix + '/lib/transactions/CheckTxStatus'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  tokenRuleConstants = require(rootPrefix + '/lib/globalConstant/tokenRule'),
  RuleCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Rule'),
  ruleConstants = require(rootPrefix + '/lib/globalConstant/rule'),
  TokenRule = require(rootPrefix + '/app/models/mysql/TokenRule');

class PostRegisterPricerRule {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Integer} params.tokenId - id in tokens table
   * @param {Integer} params.auxChainId - chainId
   * @param {String} params.transactionHash - transactionHash
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.tokenId = params.tokenId;
    oThis.auxChainId = params['auxChainId'];
    oThis.transactionHash = params.transactionHash;

    oThis.transactionSuccessful = false;
  }

  /**
   *  performer
   *
   * @returns {Promise<*>}
   */
  async perform() {
    const oThis = this;

    await oThis._checkTxStatusFromView();

    await oThis._updateStatusInDb();

    let taskStatus;

    if (oThis.transactionSuccessful) {
      taskStatus = workflowStepConstants.taskDone;
    } else {
      taskStatus = workflowStepConstants.taskFailed;
    }

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: taskStatus,
        taskResponseData: {}
      })
    );
  }

  /**
   * @return {Promise}
   * @private
   */
  async _checkTxStatusFromView() {
    const oThis = this;

    let txDetailsRsp = await oThis._fetchTransactionFromView(),
      txData = txDetailsRsp.data[oThis.transactionHash];

    let txSuccessRsp = await new CheckTxStatus({ ddbTransaction: txData }).perform();

    if (txSuccessRsp.isSuccess()) {
      oThis.transactionSuccessful = true;
    }

    return Promise.resolve(txSuccessRsp);
  }

  /**
   *
   * @return {Promise<never>}
   * @private
   */
  async _updateStatusInDb() {
    const oThis = this;

    let ruleFetchRsp = await new RuleCache({
      name: ruleConstants.pricerRuleName,
      tokenId: 0
    }).fetch();

    if (ruleFetchRsp.isFailure() || !ruleFetchRsp.data) {
      return Promise.reject(ruleFetchRsp);
    }

    let status;

    if (oThis.transactionSuccessful) {
      status = tokenRuleConstants.registeredStatus;
    } else {
      status = tokenRuleConstants.failedStatus;
    }

    await new TokenRule().updateStatus({
      tokenId: oThis.tokenId,
      ruleId: ruleFetchRsp.data.id,
      status: status
    });
  }

  /***
   * This method extracts transactionReceipt from dynamodb
   *
   * @private
   */
  async _fetchTransactionFromView() {
    const oThis = this,
      getTxDetailsObj = new GetDetailsFromDDB({
        chainId: oThis.auxChainId,
        transactionHashes: [oThis.transactionHash]
      }),
      getTxDetailsRsp = await getTxDetailsObj.perform();

    if (getTxDetailsRsp.isFailure()) return Promise.reject(getTxDetailsRsp);

    return getTxDetailsRsp;
  }
}

module.exports = PostRegisterPricerRule;
