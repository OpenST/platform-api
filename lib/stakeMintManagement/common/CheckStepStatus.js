'use strict';
/**
 * Check step status.
 *
 * @module lib/stakeMintManagement/common/CheckStepStatus
 */
const MosaicTbd = require('@openstfoundation/mosaic-tbd'),
  rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CheckTxStatus = require(rootPrefix + '/lib/transactions/CheckTxStatus'),
  Base = require(rootPrefix + '/lib/stakeMintManagement/Base'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

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
class CheckStepStatus extends Base {
  /**
   * Constructor to check step status
   *
   * @param params
   * @param params.originChainId {Number} - Origin chainId
   * @param params.auxChainId {Number} - Aux chainId
   * @param params.chainId {Number} - chainId
   * @param params.transactionHash {String} - transactionHash
   * @param params.currentStep {String} - Current step to check message hash for.
   * @param params.messageHash {String} - Message hash to check status.
   *
   * @constructor
   */
  constructor(params) {
    super(params);
  }

  /**
   * Performer
   *
   * @return {Promise<>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('lib/workflow/CheckStepStatus::perform::catch');
        logger.error(error);

        return responseHelper.error({
          internal_error_identifier: 'l_smm_c_ccs_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * Async performer
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
   * _chainAddressKindsToFetch
   *
   * @return {{origin: *[]}}
   * @private
   */
  _chainAddressKindsToFetch() {
    const oThis = this;

    return {
      aux: [chainAddressConstants.auxCoGatewayContractKind],
      origin: [chainAddressConstants.originGatewayContractKind]
    };
  }

  /**
   * _tokenAddressKindsToFetch
   *
   * @return {{origin: *[]}}
   * @private
   */
  _tokenAddressKindsToFetch() {
    const oThis = this;

    let addrKinds = {};
    addrKinds[tokenAddressConstants.tokenGatewayContract] = chainAddressConstants.originGatewayContractKind;
    addrKinds[tokenAddressConstants.tokenCoGatewayContract] = chainAddressConstants.auxCoGatewayContractKind;

    return addrKinds;
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

    await oThis._fetchContractAddresses();

    let contract = null,
      messageStatus = null;
    switch (oThis.currentStep) {
      case workflowStepConstants.checkConfirmStakeStatus:
      case workflowStepConstants.checkProgressMintStatus:
        await oThis._setAuxWeb3Instance();
        contract = MosaicTbd.Contracts.getEIP20CoGateway(oThis.auxWeb3, oThis.coGatewayContract);
        messageStatus = await contract.methods.getInboxMessageStatus(oThis.messageHash).call();
        let resp = [MessageStatuses.Declared, MessageStatuses.Progressed].includes(messageStatus.toString());
        return Promise.resolve(resp);
      case workflowStepConstants.checkProgressStakeStatus:
        await oThis._setOriginWeb3Instance();
        contract = MosaicTbd.Contracts.getEIP20Gateway(oThis.originWeb3, oThis.gatewayContract);
        messageStatus = await contract.methods.getOutboxMessageStatus(oThis.messageHash).call();
        let resp1 = [MessageStatuses.Progressed].includes(messageStatus.toString());
        return Promise.resolve(resp1);
    }

    return Promise.resolve(false);
  }
}

module.exports = CheckStepStatus;
