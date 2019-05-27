'use strict';
/**
 * BT Redeem router
 *
 * @module lib/workflow/redeemAndUnstake/brandToken/Router
 */
const rootPrefix = '../../../..',
  util = require(rootPrefix + '/lib/util'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  rabbitmqConstants = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  WorkflowRouterBase = require(rootPrefix + '/lib/workflow/RouterBase'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  ExecuteRedemption = require(rootPrefix + '/lib/redeemAndUnstake/brandToken/ExecuteTokenHolderRedemption'),
  FetchRedeemIntentMessage = require(rootPrefix + '/lib/redeemAndUnstake/common/FetchRedeemIntentMessageHash'),
  CommitStateRoot = require(rootPrefix + '/lib/stateRootSync/CommitStateRoot'),
  UpdateStateRootCommits = require(rootPrefix + '/lib/stateRootSync/UpdateStateRootCommits'),
  ProveCoGatewayOnGateway = require(rootPrefix + '/lib/redeemAndUnstake/brandToken/ProveCoGateway'),
  ConfirmRedeemIntent = require(rootPrefix + '/lib/redeemAndUnstake/brandToken/ConfirmRedeemIntent'),
  ProgressRedeem = require(rootPrefix + '/lib/redeemAndUnstake/brandToken/ProgressRedeem'),
  ProgressUnstake = require(rootPrefix + '/lib/redeemAndUnstake/brandToken/ProgressUnstake'),
  CheckRedeemTransactionsStatus = require(rootPrefix + '/lib/redeemAndUnstake/common/CheckRedeemTransactionsStatuses'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  btRedeemStepsConfig = require(rootPrefix + '/lib/workflow/redeemAndUnstake/brandToken/stepsConfig');

/**
 * Class for BT Redeem router.
 *
 * @class
 */
class BTRedeemAndUnstakeRouter extends WorkflowRouterBase {
  /**
   * Constructor for Redeem router.
   *
   * @constructor
   */
  constructor(params) {
    params['workflowKind'] = workflowConstants.btRedeemAndUnstakeKind; // Assign workflowKind.

    super(params);
    const oThis = this;
    oThis.isRetrialAttempt = params.isRetrialAttempt || 0;
  }

  /**
   * Fetch current step config for every router.
   *
   * @private
   */
  _fetchCurrentStepConfig() {
    const oThis = this;

    oThis.currentStepConfig = btRedeemStepsConfig[oThis.stepKind];
  }

  /**
   * Perform step.
   *
   * @return {Promise<*>}
   *
   * @private
   */
  async _performStep() {
    const oThis = this;

    Object.assign(oThis.requestParams, { payloadDetails: oThis._currentStepPayloadForPendingTrx() });

    switch (oThis.stepKind) {
      case workflowStepConstants.btRedeemAndUnstakeInit:
        return oThis._initializeBTRedeem();

      // Tx status check
      case workflowStepConstants.checkExecuteBTRedemptionStatus:
      case workflowStepConstants.checkProveCoGatewayStatus:
      case workflowStepConstants.checkConfirmRedeemStatus:
      case workflowStepConstants.checkProgressRedeemStatus:
      case workflowStepConstants.checkProgressUnstakeStatus:
        let stepParams = {};
        Object.assign(stepParams, oThis.requestParams, { currentStep: oThis.stepKind });
        return new CheckRedeemTransactionsStatus(stepParams).perform();

      case workflowStepConstants.executeBTRedemption:
        return new ExecuteRedemption(oThis.requestParams).perform();

      case workflowStepConstants.fetchRedeemIntentMessageHash:
        return new FetchRedeemIntentMessage(oThis.requestParams).perform();

      case workflowStepConstants.commitStateRoot:
        if (oThis.isRetrialAttempt) {
          Object.assign(oThis.requestParams, { isRetrialAttempt: oThis.isRetrialAttempt });
        }
        return new CommitStateRoot(oThis.requestParams).perform(oThis._currentStepPayloadForPendingTrx());

      // Update status in state root commit history
      case workflowStepConstants.updateCommittedStateRootInfo:
        return new UpdateStateRootCommits(oThis.requestParams).perform();

      case workflowStepConstants.proveCoGatewayOnGateway:
        Object.assign(oThis.requestParams, { currentWorkflowId: oThis.workflowId });
        return new ProveCoGatewayOnGateway(oThis.requestParams).perform();

      case workflowStepConstants.confirmRedeemIntent:
        return new ConfirmRedeemIntent(oThis.requestParams).perform();

      case workflowStepConstants.progressRedeem:
        return new ProgressRedeem(oThis.requestParams).perform();

      case workflowStepConstants.progressUnstake:
        return new ProgressUnstake(oThis.requestParams).perform();

      case workflowStepConstants.markSuccess:
        logger.step('*** Mark BT Redeem As Success');

        return oThis.handleSuccess();

      case workflowStepConstants.markFailure:
        logger.step('*** Mark BT Redeem As Failed');

        return oThis.handleFailure();

      default:
        logger.debug('default oThis.workflowId', oThis.workflowId);
        console.log('default oThis.stepKind', oThis.stepKind);
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'e_wr_bt_redeem_unstake_1',
            api_error_identifier: 'something_went_wrong',
            debug_options: { workflowId: oThis.workflowId }
          })
        );
    }
  }

  /**
   * Get next step configs.
   *
   * @param nextStep
   *
   * @return {*}
   */
  getNextStepConfigs(nextStep) {
    return btRedeemStepsConfig[nextStep];
  }

  /**
   * Rabbitmq kind to which after receipt params to be published
   *
   * @private
   */
  get _rabbitmqKind() {
    return rabbitmqConstants.globalRabbitmqKind;
  }

  /**
   * SHA Hash to uniquely identify workflow, to avoid same commits
   *
   * @returns {String}
   *
   * @private
   */
  _uniqueWorkflowHash() {
    const oThis = this;

    let uniqueStr = oThis.chainId + '_redeem_';
    uniqueStr += oThis.requestParams.tokenId + '_';
    uniqueStr += oThis.requestParams.redeemerAddress + '_';
    uniqueStr += oThis.requestParams.redeemerNonce + '_';
    uniqueStr += basicHelper.getCurrentTimestampInSeconds(); // Current timestamp

    return util.createSha256Digest(uniqueStr);
  }

  /**
   * Initialize BT Redeem
   *
   * @returns {String}
   *
   * @private
   */
  async _initializeBTRedeem() {
    const oThis = this;

    // Fetch all addresses associated to auxChainId.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.requestParams.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_wr_bt_redeem_unstake_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    Object.assign(oThis.requestParams, {
      facilitator: chainAddressesRsp.data[chainAddressConstants.interChainFacilitatorKind].address
    });

    return oThis.insertInitStep();
  }
}

module.exports = BTRedeemAndUnstakeRouter;
