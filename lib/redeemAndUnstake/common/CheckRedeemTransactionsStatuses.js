/**
 * Module to check statuses of transactions performed in flow of Redeem and Unstake.
 *
 * @module lib/redeemAndUnstake/common/CheckRedeemTransactionsStatuses
 */

const MosaicJs = require('@openst/mosaic.js');

const rootPrefix = '../../..',
  RedeemBase = require(rootPrefix + '/lib/redeemAndUnstake/Base'),
  CheckTxStatus = require(rootPrefix + '/lib/transactions/CheckTxStatus'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

// Declare variables.
const MessageStatuses = {
  Undeclared: '0',
  Declared: '1',
  Progressed: '2',
  DeclaredRevocation: '3',
  Revoked: '4'
};

/**
 * Class to check statuses of transactions performed in flow of Redeem and Unstake.
 *
 * @class CheckRedeemTransactionsStatuses
 */
class CheckRedeemTransactionsStatuses extends RedeemBase {
  /**
   * Constructor to check statuses of transactions performed in flow of Redeem and Unstake.
   *
   * @param {object} params
   * @param {object} params.payloadDetails
   * @param {number} params.originChainId
   * @param {number} params.auxChainId
   * @param {string} params.redeemerAddress
   * @param {number} params.amountToRedeem
   * @param {string} params.beneficiary
   * @param {string} params.transactionHash
   * @param {string} params.messageHash
   * @param {string} params.currentStep
   *
   * @augments RedeemBase
   *
   * @constructor
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
   * Main performer of class.
   *
   * @return {Promise<>}
   */
  async perform() {
    const oThis = this,
      checkTxStatus = new CheckTxStatus({ chainId: oThis.chainId, transactionHash: oThis.transactionHash }),
      response = await checkTxStatus.perform();

    let taskStatus = workflowStepConstants.taskDone;
    if (!response.isSuccess()) {
      // Transaction status is failed so now check for message hash status from contract.
      const messageStatus = await oThis._checkMessageStatusFromContract();
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
   * @return {boolean}
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

    const resp = allowedMessageStatuses.includes(messageStatus.toString());

    return Promise.resolve(resp);
  }

  /**
   * Fetch gateway addresses.
   *
   * @sets oThis.coGatewayContract, oThis.gatewayContract
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchGatewayContractAddresses() {
    const oThis = this;

    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    oThis.coGatewayContract = chainAddressesRsp.data[chainAddressConstants.auxCoGatewayContractKind].address;
    oThis.gatewayContract = chainAddressesRsp.data[chainAddressConstants.originGatewayContractKind].address;
  }
}

module.exports = CheckRedeemTransactionsStatuses;
