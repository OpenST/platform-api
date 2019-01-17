'use strict';

const rootPrefix = '../../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  stPrimeMintingStepsConfig = require(rootPrefix + '/executables/workflowRouter/stakeAndMint/stPrimeConfig'),
  WorkflowRouterBase = require(rootPrefix + '/executables/workflowRouter/base'),
  Approve = require(rootPrefix + '/lib/stakeMintManagement/stPrime/ApproveOriginGatewayInBase'),
  SimpleTokenStake = require(rootPrefix + '/lib/stakeMintManagement/stPrime/Stake'),
  ProveGateway = require(rootPrefix + '/lib/stakeMintManagement/common/ProveGatewayOnCoGateway'),
  ConfirmStakeIntent = require(rootPrefix + '/lib/stakeMintManagement/common/ConfirmStakeIntentOnCoGateway'),
  ProgressStake = require(rootPrefix + '/lib/stakeMintManagement/common/ProgressStakeOnGateway'),
  ProgressMint = require(rootPrefix + '/lib/stakeMintManagement/common/ProgressMintOnCoGateway'),
  UpdateStateRootCommits = require(rootPrefix + '/lib/stateRootSync/UpdateStateRootCommits'),
  CheckStepStatus = require(rootPrefix + '/lib/stakeMintManagement/common/CheckStepStatus'),
  CommitStateRoot = require(rootPrefix + '/lib/stateRootSync/commitStateRoot'),
  FetchStakeIntentMessage = require(rootPrefix + '/lib/stakeMintManagement/common/FetchStakeIntentMessageHash');

class StPrimeMintRouter extends WorkflowRouterBase {
  constructor(params) {
    super(params);

    const oThis = this;

    console.log('===oThis.stepKind', oThis.stepKind);

    oThis.currentStepConfig = stPrimeMintingStepsConfig[oThis.stepKind];
  }

  /**
   * stepsFactory
   *
   * @return {Promise<*>}
   */
  async stepsFactory() {
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

      // st prime minting
      case workflowStepConstants.stPrimeApprove:
        return new Approve(oThis.requestParams).perform(oThis._currentStepPayloadForPendingTrx());

      case workflowStepConstants.simpleTokenStake:
        return new SimpleTokenStake(oThis.requestParams).perform(oThis._currentStepPayloadForPendingTrx());

      case workflowStepConstants.commitStateRoot:
        return new CommitStateRoot({
          auxChainId: oThis.requestParams.auxChainId,
          fromOriginToAux: 1
        }).perform(oThis._currentStepPayloadForPendingTrx());

      // update status in state root commit history
      case workflowStepConstants.updateCommittedStateRootInfo:
        let updateStateRootCommits = new UpdateStateRootCommits({
          auxChainId: oThis.requestParams.auxChainId,
          fromOriginToAux: 1
        });
        return updateStateRootCommits.perform();

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

      default:
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'e_wr_snm_stpr_1',
            api_error_identifier: 'something_went_wrong',
            debug_options: { parentStepId: oThis.parentStepId }
          })
        );
    }
  }

  /**
   * getNextStepConfigs
   *
   * @param nextStep
   * @return {*}
   */
  getNextStepConfigs(nextStep) {
    console.log('====nextStep', nextStep);

    return stPrimeMintingStepsConfig[nextStep];
  }
}

module.exports = StPrimeMintRouter;
