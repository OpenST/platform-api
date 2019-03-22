'use strict';
/**
 * ST Prime Redeem router
 *
 * @module lib/workflow/redeemAndUnstake/stPrime/Router
 */
const rootPrefix = '../../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  rabbitmqConstants = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  WorkflowRouterBase = require(rootPrefix + '/lib/workflow/RouterBase'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  WrapStPrimeAsBt = require(rootPrefix + '/lib/redeemAndUnstake/stPrime/WrapSTPrimeAsBt'),
  StPrimeApproveCoGateway = require(rootPrefix + '/lib/redeemAndUnstake/stPrime/ApproveCoGateway'),
  StPrimeRedeem = require(rootPrefix + '/lib/redeemAndUnstake/stPrime/Redeem'),
  FetchRedeemIntentMessage = require(rootPrefix + '/lib/redeemAndUnstake/common/FetchRedeemIntentMessageHash'),
  CommitStateRoot = require(rootPrefix + '/lib/stateRootSync/CommitStateRoot'),
  UpdateStateRootCommits = require(rootPrefix + '/lib/stateRootSync/UpdateStateRootCommits'),
  ProveCoGatewayOnGateway = require(rootPrefix + '/lib/redeemAndUnstake/common/ProveCoGateway'),
  ConfirmRedeemIntent = require(rootPrefix + '/lib/redeemAndUnstake/common/ConfirmRedeemIntent'),
  ProgressRedeem = require(rootPrefix + '/lib/redeemAndUnstake/common/ProgressRedeem'),
  ProgressUnstake = require(rootPrefix + '/lib/redeemAndUnstake/common/ProgressUnstake'),
  CheckRedeemTransactionsStatus = require(rootPrefix + '/lib/redeemAndUnstake/common/CheckRedeemTransactionsStatuses'),
  stPrimeRedeemStepsConfig = require(rootPrefix + '/lib/workflow/redeemAndUnstake/stPrime/stepsConfig');

/**
 * Class for STPrime Redeem router.
 *
 * @class
 */
class StPrimeRedeemAndUnstakeRouter extends WorkflowRouterBase {
  /**
   * Constructor for STPrime Redeem router.
   *
   * @constructor
   */
  constructor(params) {
    params['workflowKind'] = workflowConstants.stPrimeRedeemAndUnstakeKind; // Assign workflowKind.

    super(params);
  }

  /**
   * Fetch current step config for every router.
   *
   * @private
   */
  _fetchCurrentStepConfig() {
    const oThis = this;

    oThis.currentStepConfig = stPrimeRedeemStepsConfig[oThis.stepKind];
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
      case workflowStepConstants.stPrimeRedeemAndUnstakeInit:
        return oThis.insertInitStep();

      // Tx status check
      case workflowStepConstants.checkWrapStPrimeStatus:
      case workflowStepConstants.checkApproveCoGatewayStatus:
      case workflowStepConstants.checkRedeemStatus:
      case workflowStepConstants.checkProveCoGatewayStatus:
      case workflowStepConstants.checkConfirmRedeemStatus:
      case workflowStepConstants.checkProgressRedeemStatus:
      case workflowStepConstants.checkProgressUnstakeStatus:
        let stepParams = {};
        Object.assign(stepParams, oThis.requestParams, { currentStep: oThis.stepKind });
        return new CheckRedeemTransactionsStatus(stepParams).perform();

      case workflowStepConstants.stPrimeWrapAsBT:
        return new WrapStPrimeAsBt(oThis.requestParams).perform();

      case workflowStepConstants.stPrimeApproveCoGateway:
        return new StPrimeApproveCoGateway(oThis.requestParams).perform();

      case workflowStepConstants.stPrimeRedeem:
        return new StPrimeRedeem(oThis.requestParams).perform();

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
        return new ProveCoGatewayOnGateway(oThis.requestParams).perform();

      case workflowStepConstants.confirmRedeemIntent:
        return new ConfirmRedeemIntent(oThis.requestParams).perform();

      case workflowStepConstants.progressRedeem:
        return new ProgressRedeem(oThis.requestParams).perform();

      case workflowStepConstants.progressUnstake:
        return new ProgressUnstake(oThis.requestParams).perform();

      case workflowStepConstants.markSuccess:
        logger.step('*** Mark ST Prime Redeem As Success');

        return oThis.handleSuccess();

      case workflowStepConstants.markFailure:
        logger.step('*** Mark ST Prime Redeem As Failed');

        return oThis.handleFailure();

      default:
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'e_wr_redeem_unstake_1',
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
    return stPrimeRedeemStepsConfig[nextStep];
  }

  /**
   * Rabbitmq kind to which after receipt params to be published
   *
   * @private
   */
  get _rabbitmqKind() {
    return rabbitmqConstants.globalRabbitmqKind;
  }
}

module.exports = StPrimeRedeemAndUnstakeRouter;
