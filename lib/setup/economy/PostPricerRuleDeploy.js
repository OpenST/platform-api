'use strict';

/**
 *
 * @module lib/setup/economy/PostPricerRuleDeploy
 */

const rootPrefix = '../../..',
  GetDetailsFromDDB = require(rootPrefix + '/lib/transactions/GetDetailsFromDDB'),
  CheckTxStatus = require(rootPrefix + '/lib/transactions/CheckTxStatus'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  tokenRuleConstants = require(rootPrefix + '/lib/globalConstant/tokenRule'),
  RuleModel = require(rootPrefix + '/app/models/mysql/Rule'),
  TokenRule = require(rootPrefix + '/app/models/mysql/TokenRule');

class PostPricerRuleDeploy {
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

  async _setContractAddress() {
    const oThis = this;

    let txDetailsRsp = await oThis._fetchTransactionFromView(),
      txData = txDetailsRsp.data[oThis.transactionHash];

    let txSuccessRsp = await new CheckTxStatus({ ddbTransaction: txData }).perform();

    if (txSuccessRsp.isFailure()) return Promise.reject(txSuccessRsp);

    oThis.contractAddress = txData.contractAddress;
  }

  async _insertInDb() {
    const oThis = this,
      fetchPricerRuleRsp = await RuleModel.getPricerRuleDetails();

    await new TokenRule().insertRecord({
      tokenId: oThis.tokenId,
      ruleId: fetchPricerRuleRsp.data.id,
      address: oThis.contractAddress,
      status: tokenRuleConstants.createdStatus
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

module.exports = PostPricerRuleDeploy;
