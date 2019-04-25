/**
 * Module to check mint step status.
 *
 * @module lib/stakeAndMint/common/CheckProgressMintStatusBase
 */

const MosaicJs = require('@openst/mosaic.js');

const rootPrefix = '../../..',
  StakeAndMintBase = require(rootPrefix + '/lib/stakeAndMint/Base'),
  CheckTxStatus = require(rootPrefix + '/lib/transactions/CheckTxStatus'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

// Declare variables.
const MessageStatuses = {
  Undeclared: '0',
  Declared: '1',
  Progressed: '2',
  DeclaredRevocation: '3',
  Revoked: '4'
};

/**
 * Class to check step status.
 *
 * @class CheckMintStatus
 */
class CheckMintStatus extends StakeAndMintBase {
  /**
   * Constructor to check step status.
   *
   * @param {object} params
   * @param {string/number} params.chainId
   * @param {string} params.transactionHash
   * @param {string} params.messageHash
   * @param {string} params.currentStep
   * @param {string/number} params.auxChainId
   * @param {string/number} params.originChainId
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
    oThis.messageHash = params.messageHash;
    oThis.currentStep = params.currentStep;
    oThis.auxChainId = params.auxChainId;
    oThis.originChainId = params.originChainId;

    oThis.coGatewayContract = null;
  }

  /**
   * Main performer of the class.
   *
   * @return {Promise<>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      }
      logger.error('lib/workflow/CheckProgressMintStatus::perform::catch');
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 'l_smm_c_ccs_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    });
  }

  /**
   * Async perform.
   *
   * @return {Promise<any>}
   */
  async asyncPerform() {
    const oThis = this,
      checkTxStatus = new CheckTxStatus({ chainId: oThis.chainId, transactionHash: oThis.transactionHash }),
      response = await checkTxStatus.perform();

    let taskStatus = workflowStepConstants.taskDone;
    if (!response.isSuccess()) {
      // Transaction status is failed so now check for message hash status from contract
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

    await oThis._fetchGatewayAddresses();

    let contract = null,
      messageStatus = '',
      allowedMessageStatuses = [];
    switch (oThis.currentStep) {
      case workflowStepConstants.checkConfirmStakeStatus:
        await oThis._setAuxWeb3Instance();
        contract = MosaicJs.Contracts.getEIP20CoGateway(oThis.auxWeb3, oThis.coGatewayContract);
        messageStatus = await contract.methods.getInboxMessageStatus(oThis.messageHash).call();
        allowedMessageStatuses = [MessageStatuses.Declared, MessageStatuses.Progressed];
        break;
      case workflowStepConstants.checkProgressMintStatus:
        await oThis._setAuxWeb3Instance();
        contract = MosaicJs.Contracts.getEIP20CoGateway(oThis.auxWeb3, oThis.coGatewayContract);
        messageStatus = await contract.methods.getInboxMessageStatus(oThis.messageHash).call();
        allowedMessageStatuses = [MessageStatuses.Progressed];
        break;
      case workflowStepConstants.checkProgressStakeStatus:
        await oThis._setOriginWeb3Instance();
        contract = MosaicJs.Contracts.getEIP20Gateway(oThis.originWeb3, oThis.gatewayContract);
        messageStatus = await contract.methods.getOutboxMessageStatus(oThis.messageHash).call();
        allowedMessageStatuses = [MessageStatuses.Progressed];
        break;
      default:
        throw new Error(`Invalid workflow step ${oThis.currentStep}`);
    }

    const resp = allowedMessageStatuses.includes(messageStatus.toString());

    return Promise.resolve(resp);
  }

  /**
   * Fetch gateway addresses.
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchGatewayAddresses() {
    throw new Error('Sub-class to implement.');
  }
}

module.exports = CheckMintStatus;
