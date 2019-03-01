'use strict';

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  StakeAndMintBase = require(rootPrefix + '/lib/stakeAndMint/Base'),
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

  /**
   * _setWeb3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setOriginWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.originChainId]);

    oThis.originChainConfig = response[oThis.originChainId];

    let shuffledProviders = basicHelper.shuffleArray(oThis.originChainConfig.originGeth.readWrite.wsProviders);

    oThis.originWeb3 = web3Provider.getInstance(shuffledProviders[0]).web3WsProvider;
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
