'use strict';
/**
 * ST Prime minting router
 *
 * @module lib/workflow/stakeAndMint/stPrime/Router
 */
const rootPrefix = '../../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  rabbitmqConstants = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  CommitStateRoot = require(rootPrefix + '/lib/stateRootSync/CommitStateRoot'),
  WorkflowRouterBase = require(rootPrefix + '/lib/workflow/RouterBase'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  SimpleTokenStake = require(rootPrefix + '/lib/stakeAndMint/stPrime/Stake'),
  CheckMintStatus = require(rootPrefix + '/lib/stakeAndMint/stPrime/CheckMintStatus'),
  UpdateStateRootCommits = require(rootPrefix + '/lib/stateRootSync/UpdateStateRootCommits'),
  Approve = require(rootPrefix + '/lib/stakeAndMint/stPrime/ApproveOriginGateway'),
  ProgressStake = require(rootPrefix + '/lib/stakeAndMint/stPrime/ProgressStake'),
  ProgressMint = require(rootPrefix + '/lib/stakeAndMint/stPrime/ProgressMint'),
  ProveGateway = require(rootPrefix + '/lib/stakeAndMint/stPrime/ProveGateway'),
  stPrimeStakeAndMintStepsConfig = require(rootPrefix + '/lib/workflow/stakeAndMint/stPrime/stepsConfig'),
  ConfirmStakeIntent = require(rootPrefix + '/lib/stakeAndMint/stPrime/ConfirmStakeIntent'),
  FetchStakeIntentMessage = require(rootPrefix + '/lib/stakeAndMint/common/FetchStakeIntentMessageHash');

/**
 * Class for STPrime mint router.
 *
 * @class
 */
class StPrimeStakeAndMintRouter extends WorkflowRouterBase {
  /**
   * Constructor for STPrime mint router.
   *
   * @constructor
   */
  /**
   * Workflow request params:
   * {
   *    "stakerAddress":"0xabc___",
   *    "originChainId":3,
   *    "auxChainId":199,
   *    "sourceChainId":3,
   *    "destinationChainId":199,
   *    "facilitator":"0xabc___",
   *    "amountToStake":"1000000000000000000000000",
   *    "beneficiary":"0xabc___",
   *    "firstTimeMint":true,
   *    "chainId":3
   * }
   */
  constructor(params) {
    params['workflowKind'] = workflowConstants.stPrimeStakeAndMintKind; // Assign workflowKind.

    super(params);
  }

  /**
   * Fetch current step config for every router.
   *
   * @private
   */
  _fetchCurrentStepConfig() {
    const oThis = this;

    oThis.currentStepConfig = stPrimeStakeAndMintStepsConfig[oThis.stepKind];
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

    switch (oThis.stepKind) {
      case workflowStepConstants.stPrimeStakeAndMintInit:
        return oThis.insertInitStep();

      // Tx status check
      case workflowStepConstants.checkApproveStatus:
      case workflowStepConstants.checkStakeStatus:
      case workflowStepConstants.checkProveGatewayStatus:
      case workflowStepConstants.checkConfirmStakeStatus:
      case workflowStepConstants.checkProgressStakeStatus:
      case workflowStepConstants.checkProgressMintStatus:
        let stepParams = {};
        Object.assign(stepParams, oThis.requestParams, { currentStep: oThis.stepKind });
        return new CheckMintStatus(stepParams).perform();

      // ST prime minting
      case workflowStepConstants.stPrimeApprove:
        return new Approve(oThis.requestParams).perform(oThis._currentStepPayloadForPendingTrx());

      case workflowStepConstants.simpleTokenStake:
        return new SimpleTokenStake(oThis.requestParams).perform(oThis._currentStepPayloadForPendingTrx());

      case workflowStepConstants.commitStateRoot:
        let isFirstTimeMint = oThis.requestParams.firstTimeMint;
        Object.assign(oThis.requestParams, { runOnZeroGas: isFirstTimeMint });
        if (oThis.isRetrialAttempt) {
          Object.assign(oThis.requestParams, { isRetrialAttempt: oThis.isRetrialAttempt });
        }
        return new CommitStateRoot(oThis.requestParams).perform(oThis._currentStepPayloadForPendingTrx());

      // Update status in state root commit history
      case workflowStepConstants.updateCommittedStateRootInfo:
        return new UpdateStateRootCommits(oThis.requestParams).perform();

      case workflowStepConstants.proveGatewayOnCoGateway:
        return new ProveGateway(oThis.requestParams).perform(oThis._currentStepPayloadForPendingTrx());

      case workflowStepConstants.confirmStakeIntent:
        return new ConfirmStakeIntent(oThis.requestParams).perform(oThis._currentStepPayloadForPendingTrx());

      case workflowStepConstants.progressStake:
        return new ProgressStake(oThis.requestParams).perform(oThis._currentStepPayloadForPendingTrx());

      case workflowStepConstants.progressMint:
        return new ProgressMint(oThis.requestParams).perform(oThis._currentStepPayloadForPendingTrx());

      case workflowStepConstants.fetchStakeIntentMessageHash:
        return new FetchStakeIntentMessage(oThis.requestParams).perform();

      case workflowStepConstants.markSuccess:
        logger.step('*** Mark ST Prime Minting As Success');

        return oThis.handleSuccess();

      case workflowStepConstants.markFailure:
        logger.step('*** Mark ST Prime Minting As Failed');

        return oThis.handleFailure();

      default:
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'e_wr_snm_stpr_1',
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
    return stPrimeStakeAndMintStepsConfig[nextStep];
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

module.exports = StPrimeStakeAndMintRouter;
