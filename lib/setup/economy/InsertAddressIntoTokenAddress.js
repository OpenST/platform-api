'use strict';
/**
 * This module fetch transactionReceipt from ddb and inserts its respective contract Address into token address table.
 *
 * @module lib/setup/economy/InsertAddressIntoTokenAddress
 */
const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CheckTxStatus = require(rootPrefix + '/lib/transactions/CheckTxStatus'),
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  GetDetailsFromDDB = require(rootPrefix + '/lib/transactions/GetDetailsFromDDB'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

class InsertAddressIntoTokenAddress {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Integer} params.tokenId - id in tokens table
   * @param {String} params.kind - address kind
   * @param {Integer} params.chainId - chainId
   * @param {String} params.chainKind - chainKind
   * @param {String} params.transactionHash - transactionHash
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;
    oThis.tokenId = params.tokenId;
    oThis.kind = params.kind;
    oThis.chainId = params.chainId;
    oThis.chainKind = params.chainKind;
    oThis.transactionHash = params.transactionHash;
  }

  /**
   *  performer
   *
   * @returns {Promise<*>}
   */
  async perform() {
    const oThis = this;

    let txDetailsRsp = await oThis._fetchTransactionFromView(),
      txData = txDetailsRsp.data[oThis.transactionHash];

    let txSuccessRsp = await new CheckTxStatus({ ddbTransaction: txData }).perform();

    if (txSuccessRsp.isFailure()) return Promise.reject(txSuccessRsp);

    let contractAddress = txData.contractAddress;

    let tokenAddressObj = new TokenAddressModel(),
      deployedChainKindInt = tokenAddressObj.invertedDeployedChainKinds[oThis.chainKind];

    await tokenAddressObj.insertAddress({
      tokenId: oThis.tokenId,
      kind: tokenAddressObj.invertedKinds[oThis.kind],
      address: contractAddress,
      deployedChainKind: deployedChainKindInt,
      deployedChainId: oThis.chainId
    });

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone,
        taskResponseData: {
          contractAddress: contractAddress
        }
      })
    );
  }

  /***
   * This method extracts transactionReceipt from dynamodb
   *
   * @private
   */
  async _fetchTransactionFromView() {
    const oThis = this,
      getTxDetailsObj = new GetDetailsFromDDB({
        chainId: oThis.chainId,
        transactionHashes: [oThis.transactionHash]
      }),
      getTxDetailsRsp = await getTxDetailsObj.perform();

    if (getTxDetailsRsp.isFailure()) return Promise.reject(getTxDetailsRsp);

    return getTxDetailsRsp;
  }
}

module.exports = InsertAddressIntoTokenAddress;
