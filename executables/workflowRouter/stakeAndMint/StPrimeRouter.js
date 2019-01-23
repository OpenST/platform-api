'use strict';
/**
 * ST Prime minting router
 *
 * @module executables/workflowRouter/stakeAndMint/StPrimeRouter
 */
const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  CommitStateRoot = require(rootPrefix + '/lib/stateRootSync/CommitStateRoot'),
  WorkflowRouterBase = require(rootPrefix + '/executables/workflowRouter/Base'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  SimpleTokenStake = require(rootPrefix + '/lib/stakeMintManagement/stPrime/Stake'),
  CheckStepStatus = require(rootPrefix + '/lib/stakeMintManagement/common/CheckStepStatus'),
  UpdateStateRootCommits = require(rootPrefix + '/lib/stateRootSync/UpdateStateRootCommits'),
  Approve = require(rootPrefix + '/lib/stakeMintManagement/stPrime/ApproveOriginGatewayInBase'),
  ProgressStake = require(rootPrefix + '/lib/stakeMintManagement/common/ProgressStakeOnGateway'),
  ProgressMint = require(rootPrefix + '/lib/stakeMintManagement/common/ProgressMintOnCoGateway'),
  ProveGateway = require(rootPrefix + '/lib/stakeMintManagement/common/ProveGatewayOnCoGateway'),
  stPrimeMintingStepsConfig = require(rootPrefix + '/executables/workflowRouter/stakeAndMint/stPrimeConfig'),
  ConfirmStakeIntent = require(rootPrefix + '/lib/stakeMintManagement/common/ConfirmStakeIntentOnCoGateway'),
  FetchStakeIntentMessage = require(rootPrefix + '/lib/stakeMintManagement/common/FetchStakeIntentMessageHash');

/**
 * Class for STPrime mint router.
 *
 * @class
 */
class StPrimeMintRouter extends WorkflowRouterBase {
  /**
   * Constructor for STPrime mint router.
   *
   * @constructor
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

    oThis.currentStepConfig = stPrimeMintingStepsConfig[oThis.stepKind];
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
        let checkStepStatus = new CheckStepStatus(oThis.requestParams);
        return checkStepStatus.perform();

      // ST prime minting
      case workflowStepConstants.stPrimeApprove:
        return new Approve(oThis.requestParams).perform(oThis._currentStepPayloadForPendingTrx());

      case workflowStepConstants.simpleTokenStake:
        return new SimpleTokenStake(oThis.requestParams).perform(oThis._currentStepPayloadForPendingTrx());

      case workflowStepConstants.commitStateRoot:
        Object.assign(oThis.requestParams, { fromOriginToAux: 1 });
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

        return await oThis.handleSuccess();

      case workflowStepConstants.markFailure:
        logger.step('*** Mark ST Prime Minting As Failed');

        return await oThis.handleFailure();

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
    return stPrimeMintingStepsConfig[nextStep];
  }
}

module.exports = StPrimeMintRouter;
