'use strict';

/**
 *
 * @module lib/setup/economy/PostAddCompanyWallet
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

class PostAddCompanyWallet {
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

    oThis.tokenCompanyTokenHolderAddress = null;
  }

  /**
   *  performer
   *
   * @returns {Promise<*>}
   */
  async perform() {
    const oThis = this;

    await oThis._setContractAddress();

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone,
        taskResponseData: {
          contractAddress: oThis.tokenCompanyTokenHolderAddress
        }
      })
    );
  }

  async _setContractAddress() {
    const oThis = this;

    let txDetailsRsp = await oThis._fetchTransactionFromView(),
      txData = txDetailsRsp.data[oThis.transactionHash];

    let txSuccessRsp = await new CheckTxStatus({ ddbTransaction: txData }).perform();

    if (txSuccessRsp.isFailure()) return Promise.reject(txSuccessRsp);

    oThis.tokenCompanyTokenHolderAddress = txData.contractAddress;
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

module.exports = PostAddCompanyWallet;
