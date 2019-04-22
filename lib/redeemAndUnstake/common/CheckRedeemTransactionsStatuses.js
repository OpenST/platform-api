'use strict';
/**
 * Check statuses of transactions performed in flow of Redeem and Unstake.
 *
 * @module lib/redeemAndUnstake/common/CheckRedeemTransactionsStatuses
 */
const MosaicJs = require('@openst/mosaic.js');

const rootPrefix = '../../..',
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  CheckTxStatus = require(rootPrefix + '/lib/transactions/CheckTxStatus'),
  RedeemBase = require(rootPrefix + '/lib/redeemAndUnstake/Base');

const MessageStatuses = {
  Undeclared: '0',
  Declared: '1',
  Progressed: '2',
  DeclaredRevocation: '3',
  Revoked: '4'
};

/**
 * Class to check step status
 *
 * @class
 */
class CheckRedeemTransactionsStatuses extends RedeemBase {
  /**
   * @constructor
   *
   * @param params
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.chainId = params.chainId;
    oThis.transactionHash = params.transactionHash;
    oThis.messageHash = params.messageHash;
    oThis.currentStep = params.currentStep;

    oThis.coGatewayContract = null;
    oThis.gatewayContract = null;
  }

  /**
   * Performer
   *
   * @return {Promise<>}
   */
  async perform() {
    const oThis = this,
      checkTxStatus = new CheckTxStatus({ chainId: oThis.chainId, transactionHash: oThis.transactionHash }),
      response = await checkTxStatus.perform();

    let taskStatus = workflowStepConstants.taskDone;
    if (!response.isSuccess()) {
      // Transaction status is failed so now check for message hash status from contract
      let messageStatus = await oThis._checkMessageStatusFromContract();
      if (!messageStatus) {
        taskStatus = workflowStepConstants.taskFailed;
      }
    }

    return responseHelper.successWithData({
      taskStatus: taskStatus,
      taskResponseData: { transactionHash: oThis.transactionHash, chainId: oThis.chainId }
    });
  }

  /**
   * Check for message hash status from contract and decide whether workflow can be progressed ahead or not.
   *
   * @return {Boolean}
   * @private
   */
  async _checkMessageStatusFromContract() {
    const oThis = this;

    // Message hash is not present then send failure.
    if (!oThis.messageHash) {
      return Promise.resolve(false);
    }

    await oThis._fetchGatewayContractAddresses();

    let contract = null,
      messageStatus = '',
      allowedMessageStatuses = [];
    switch (oThis.currentStep) {
      case workflowStepConstants.checkConfirmRedeemStatus:
        await oThis._setOriginWeb3Instance();
        contract = MosaicJs.Contracts.getEIP20Gateway(oThis.originWeb3, oThis.gatewayContract);
        messageStatus = await contract.methods.getInboxMessageStatus(oThis.messageHash).call();
        allowedMessageStatuses = [MessageStatuses.Declared, MessageStatuses.Progressed];
        break;
      case workflowStepConstants.checkProgressRedeemStatus:
        await oThis._setAuxWeb3Instance();
        contract = MosaicJs.Contracts.getEIP20CoGateway(oThis.auxWeb3, oThis.coGatewayContract);
        messageStatus = await contract.methods.getOutboxMessageStatus(oThis.messageHash).call();
        allowedMessageStatuses = [MessageStatuses.Progressed];
        break;
      case workflowStepConstants.checkProgressUnstakeStatus:
        await oThis._setOriginWeb3Instance();
        contract = MosaicJs.Contracts.getEIP20Gateway(oThis.originWeb3, oThis.gatewayContract);
        messageStatus = await contract.methods.getInboxMessageStatus(oThis.messageHash).call();
        allowedMessageStatuses = [MessageStatuses.Progressed];
        break;
    }

    let resp = allowedMessageStatuses.includes(messageStatus.toString());
    return Promise.resolve(resp);
  }

  /**
   * Fetch gateway addresses
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchGatewayContractAddresses() {
    const oThis = this;

    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    oThis.coGatewayContract = chainAddressesRsp.data[chainAddressConstants.auxCoGatewayContractKind].address;
    oThis.gatewayContract = chainAddressesRsp.data[chainAddressConstants.originGatewayContractKind].address;
  }
}

module.exports = CheckRedeemTransactionsStatuses;
