'use strict';

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  StakeAndMintBase = require(rootPrefix + '/lib/stakeAndMint/OldBase'),
  CheckTxStatus = require(rootPrefix + '/lib/transactions/CheckTxStatus');

class CheckGatewayComposerAllowance extends StakeAndMintBase {
  /**
   * constructor
   *
   * @param params
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.chainId = params.chainId;
    oThis.transactionHash = params.transactionHash;
    oThis.originChainId = params.originChainId;
    oThis.stakerAddress = params.stakerAddress;
  }

  /***
   * Async performer for the class.
   *
   * @private
   * @return {Promise<result>}
   */
  async _asyncPerform() {
    const oThis = this,
      checkTxStatus = new CheckTxStatus({ chainId: oThis.chainId, transactionHash: oThis.transactionHash }),
      response = await checkTxStatus.perform();

    let respData = { transactionHash: oThis.transactionHash, chainId: oThis.chainId };
    if (response.isSuccess()) {
      return responseHelper.successWithData({ taskStatus: workflowStepConstants.taskDone, taskResponseData: respData });
    } else {
      // There is a scenario where transaction of origin chain is not present in Dynamo
      // To handle that scenario will check for receipt once.
      await oThis._setOriginWeb3Instance();
      let txReceipt = await oThis.originWeb3.eth.getTransactionReceipt(oThis.transactionHash);

      if (txReceipt) {
        return responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskDone,
          taskResponseData: respData
        });
      } else {
        return responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskFailed,
          taskResponseData: respData
        });
      }
    }
  }
}

module.exports = CheckGatewayComposerAllowance;
