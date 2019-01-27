'use strict';

/**
 *
 * @module lib/setup/economy/PostGatewayDeploy
 */

const rootPrefix = '../../..',
  StakerWhitelistedAddress = require(rootPrefix + '/app/models/mysql/StakerWhitelistedAddress'),
  stakerWhitelistedAddressConstants = require(rootPrefix + '/lib/globalConstant/stakerWhitelistedAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  CheckTxStatus = require(rootPrefix + '/lib/transactions/CheckTxStatus'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  TokenAddressCache = require(rootPrefix + '/lib/kitSaasSharedCacheManagement/TokenAddress');

class PostGatewayComposerDeploy {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Integer} params.tokenId - id in tokens table
   * @param {Integer} params.chainId - chainId
   * @param {Integer} params.clientId - clientId
   * @param {String} params.transactionHash - transactionHash
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.tokenId = params.tokenId;
    oThis.chainId = params.chainId;
    oThis.clientId = params.clientId;
    oThis.transactionHash = params.transactionHash;

    oThis.stakerAddress = null;
    oThis.gatewayComposerContractAddress = null;
  }

  /**
   *  performer
   *
   * @returns {Promise<*>}
   */
  async perform() {
    const oThis = this;

    await oThis._fetchStakerAddress();

    await oThis._verifyDeployGCTx();

    await oThis._insertStakerWhitelistedAddress();

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone,
        taskResponseData: {
          contractAddress: oThis.gatewayComposerContractAddress
        }
      })
    );
  }

  /***
   *
   */
  async _fetchStakerAddress() {
    const oThis = this;

    let getAddrRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    oThis.stakerAddress = getAddrRsp.data[tokenAddressConstants.ownerAddressKind];
  }

  /***
   *
   * @private
   */
  async _verifyDeployGCTx() {
    const oThis = this;

    let txSuccessRsp = await new CheckTxStatus({
      chainId: oThis.chainId,
      transactionHash: oThis.transactionHash
    }).perform();

    if (txSuccessRsp.isFailure()) return Promise.reject(txSuccessRsp);

    let ddbTransaction = txSuccessRsp.data.ddbTransaction;

    oThis.gatewayComposerContractAddress = ddbTransaction.contractAddress;
  }

  /***
   *
   * @private
   */
  async _insertStakerWhitelistedAddress() {
    const oThis = this;

    await new StakerWhitelistedAddress().insertAddress({
      tokenId: oThis.tokenId,
      clientId: oThis.clientId,
      status: stakerWhitelistedAddressConstants.invertedStatuses[stakerWhitelistedAddressConstants.activeStatus],
      stakerAddress: oThis.stakerAddress,
      gatewayComposerAddress: oThis.gatewayComposerContractAddress
    });
  }
}

module.exports = PostGatewayComposerDeploy;
