/**
 * Module to check gateway composer allowance.
 *
 * @module lib/stakeAndMint/brandedToken/CheckGatewayComposerAllowance
 */

const rootPrefix = '../../..',
  StakeAndMintBase = require(rootPrefix + '/lib/stakeAndMint/Base'),
  CheckTxStatus = require(rootPrefix + '/lib/transactions/CheckTxStatus'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

/**
 * Class to check gateway composer allowance.
 *
 * @class CheckGatewayComposerAllowance
 */
class CheckGatewayComposerAllowance extends StakeAndMintBase {
  /**
   * Constructor to check gateway composer allowance.
   *
   * @param {object} params
   * @param {number} params.chainId
   * @param {string} params.transactionHash
   * @param {number} params.originChainId
   * @param {string} params.stakerAddress
   *
   * @augments StakeAndMintBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.chainId = params.chainId;
    oThis.transactionHash = params.transactionHash;
    oThis.originChainId = params.originChainId;
    oThis.stakerAddress = params.stakerAddress;
  }

  /**
   * Async perform.
   *
   * @return {Promise<result>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this,
      checkTxStatus = new CheckTxStatus({ chainId: oThis.chainId, transactionHash: oThis.transactionHash }),
      response = await checkTxStatus.perform();

    const respData = { transactionHash: oThis.transactionHash, chainId: oThis.chainId };
    if (response.isSuccess()) {
      return responseHelper.successWithData({ taskStatus: workflowStepConstants.taskDone, taskResponseData: respData });
    }
    // There is a scenario where transaction of origin chain is not present in Dynamo.
    // To handle that scenario, will check for receipt once.
    await oThis._setOriginWeb3Instance();

    const txReceipt = await oThis.originWeb3.eth.getTransactionReceipt(oThis.transactionHash);

    if (txReceipt) {
      return responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone,
        taskResponseData: respData
      });
    }

    return responseHelper.successWithData({
      taskStatus: workflowStepConstants.taskFailed,
      taskResponseData: respData
    });
  }
}

module.exports = CheckGatewayComposerAllowance;
