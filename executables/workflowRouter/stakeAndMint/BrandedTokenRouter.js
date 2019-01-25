'use strict';
/**
 * Branded token mint router
 *
 * @module executables/workflowRouter/stakeAndMint/BrandedTokenRouter
 */
const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  util = require(rootPrefix + '/lib/util'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  WorkflowRouterBase = require(rootPrefix + '/executables/workflowRouter/Base'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  btMintingStepsConfig = require(rootPrefix + '/executables/workflowRouter/stakeAndMint/brandedTokenConfig'),
  FetchStakeRequestHash = require(rootPrefix + '/lib/stakeMintManagement/brandedToken/FetchStakeRequestHash'),
  AddStakerSignedTrx = require(rootPrefix + '/lib/stakeMintManagement/brandedToken/AddStakerSignedTransaction'),
  AcceptStakeByWorker = require(rootPrefix + '/lib/stakeMintManagement/brandedToken/AcceptStakeByWorker'),
  CheckStepStatus = require(rootPrefix + '/lib/stakeMintManagement/common/CheckStepStatus'),
  CommitStateRoot = require(rootPrefix + '/lib/stateRootSync/CommitStateRoot'),
  UpdateStateRootCommits = require(rootPrefix + '/lib/stateRootSync/UpdateStateRootCommits'),
  ProgressStake = require(rootPrefix + '/lib/stakeMintManagement/common/ProgressStakeOnGateway'),
  ProgressMint = require(rootPrefix + '/lib/stakeMintManagement/common/ProgressMintOnCoGateway'),
  ProveGateway = require(rootPrefix + '/lib/stakeMintManagement/common/ProveGatewayOnCoGateway'),
  ConfirmStakeIntent = require(rootPrefix + '/lib/stakeMintManagement/common/ConfirmStakeIntentOnCoGateway'),
  FetchStakeIntentMessage = require(rootPrefix + '/lib/stakeMintManagement/common/FetchStakeIntentMessageHash'),
  CheckGatewayComposerAllowance = require(rootPrefix +
    '/lib/stakeMintManagement/brandedToken/CheckGatewayComposerAllowance');

/**
 * Class for branded token mint router
 *
 * @class
 */
class BtMintRouter extends WorkflowRouterBase {
  /**
   * Constructor for branded token mint router
   *
   * @params {Object} params
   * @params {String} params.workflowKind
   *
   * @augments WorkflowRouterBase
   *
   * @constructor
   */
  constructor(params) {
    params['workflowKind'] = workflowConstants.btStakeAndMintKind; // Assign workflowKind.

    super(params);
  }

  /**
   * Fetch current step config for every router.
   *
   * @private
   */
  _fetchCurrentStepConfig() {
    const oThis = this;

    oThis.currentStepConfig = btMintingStepsConfig[oThis.stepKind];
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
      case workflowStepConstants.btStakeAndMintInit:
        return oThis.insertInitStep();

      case workflowStepConstants.stakerRequestStakeTrx:
        oThis.requestParams.transactionHash = oThis.requestParams.requestStakeTransactionHash;
        return new AddStakerSignedTrx(oThis.requestParams).perform(oThis._currentStepPayloadForPendingTrx());

      case workflowStepConstants.fetchStakeRequestHash:
        return new FetchStakeRequestHash(oThis.requestParams).perform();

      case workflowStepConstants.approveGatewayComposerTrx:
        oThis.requestParams.transactionHash = oThis.requestParams.approveTransactionHash;
        return new AddStakerSignedTrx(oThis.requestParams).perform(oThis._currentStepPayloadForPendingTrx());

      case workflowStepConstants.checkGatewayComposerAllowance:
        return new CheckGatewayComposerAllowance(oThis.requestParams).perform();

      case workflowStepConstants.acceptStake:
        return new AcceptStakeByWorker(oThis.requestParams).perform(oThis._currentStepPayloadForPendingTrx());

      case workflowStepConstants.markSuccess:
        logger.step('*** Mark branded token stake and mint as success');
        return oThis.handleSuccess();

      case workflowStepConstants.markFailure:
        logger.step('*** Mark branded token stake and mint as failed');
        return oThis.handleFailure();

      case workflowStepConstants.checkStakeStatus:
      case workflowStepConstants.checkProveGatewayStatus:
      case workflowStepConstants.checkConfirmStakeStatus:
      case workflowStepConstants.checkProgressStakeStatus:
      case workflowStepConstants.checkProgressMintStatus:
        let checkStepStatus = new CheckStepStatus(oThis.requestParams);
        return checkStepStatus.perform();

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

      default:
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'e_wr_snm_btr_1',
            api_error_identifier: 'something_went_wrong',
            debug_options: { parentStepId: oThis.parentStepId }
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
    return btMintingStepsConfig[nextStep];
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

    let uniqueStr = oThis.chainId + '_';
    uniqueStr += oThis.requestParams.approveTransactionHash + '_';
    uniqueStr += oThis.requestParams.requestStakeTransactionHash;

    return util.createSha256Digest(uniqueStr);
  }
}

module.exports = BtMintRouter;
