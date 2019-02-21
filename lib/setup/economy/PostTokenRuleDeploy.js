'use strict';

/**
 *
 * @module lib/setup/economy/PostTokenRuleDeploy
 */

const rootPrefix = '../../..',
  RuleModel = require(rootPrefix + '/app/models/mysql/Rule'),
  TokenRule = require(rootPrefix + '/app/models/mysql/TokenRule'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ruleConstants = require(rootPrefix + '/lib/globalConstant/rule'),
  CheckTxStatus = require(rootPrefix + '/lib/transactions/CheckTxStatus'),
  tokenRuleConstants = require(rootPrefix + '/lib/globalConstant/tokenRule'),
  GetDetailsFromDDB = require(rootPrefix + '/lib/transactions/GetDetailsFromDDB'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

class PostTokenRuleDeploy {
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

    oThis.contractAddress = null;
  }

  /**
   *  performer
   *
   * @returns {Promise<*>}
   */
  async perform() {
    const oThis = this;

    await oThis._setContractAddress();

    await oThis._insertInDb();

    return responseHelper.successWithData({
      taskStatus: workflowStepConstants.taskDone,
      taskResponseData: {
        contractAddress: oThis.contractAddress
      }
    });
  }

  /**
   * Set Contract address
   *
   * @returns {Promise<never>}
   * @private
   */
  async _setContractAddress() {
    const oThis = this;

    let txDetailsRsp = await oThis._fetchTransactionFromView(),
      txData = txDetailsRsp.data[oThis.transactionHash];

    let txSuccessRsp = await new CheckTxStatus({ ddbTransaction: txData }).perform();

    if (txSuccessRsp.isFailure()) return Promise.reject(txSuccessRsp);

    oThis.contractAddress = txData.contractAddress;
  }

  /**
   * Insert tokenRule into TokenRule.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _insertInDb() {
    const oThis = this,
      fetchPricerRuleRsp = await RuleModel.getTokenRuleDetails();

    await new TokenRule().insertRecord({
      tokenId: oThis.tokenId,
      ruleId: fetchPricerRuleRsp.data.id,
      address: oThis.contractAddress,
      ruleName: ruleConstants.tokenRuleName,
      ruleTokenId: fetchPricerRuleRsp.data.token_id,
      status: tokenRuleConstants.registeredStatus
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

module.exports = PostTokenRuleDeploy;
