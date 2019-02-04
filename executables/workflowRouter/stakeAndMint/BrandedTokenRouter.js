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
  FetchStakeRequestHash = require(rootPrefix + '/lib/stakeAndMint/brandedToken/FetchStakeRequestHash'),
  RecordStakerTx = require(rootPrefix + '/lib/stakeAndMint/brandedToken/RecordStakerTx'),
  AcceptStakeByWorker = require(rootPrefix + '/lib/stakeAndMint/brandedToken/AcceptStakeRequest'),
  CheckProgressMintStatus = require(rootPrefix + '/lib/stakeAndMint/brandedToken/CheckProgressMintStatus'),
  CommitStateRoot = require(rootPrefix + '/lib/stateRootSync/CommitStateRoot'),
  UpdateStateRootCommits = require(rootPrefix + '/lib/stateRootSync/UpdateStateRootCommits'),
  ProgressStake = require(rootPrefix + '/lib/stakeAndMint/brandedToken/ProgressStake'),
  ProgressMint = require(rootPrefix + '/lib/stakeAndMint/brandedToken/ProgressMint'),
  ProveGateway = require(rootPrefix + '/lib/stakeAndMint/brandedToken/ProveGateway'),
  ConfirmStakeIntent = require(rootPrefix + '/lib/stakeAndMint/brandedToken/ConfirmStakeIntent'),
  FetchStakeIntentMessage = require(rootPrefix + '/lib/stakeAndMint/common/FetchStakeIntentMessageHash'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  CheckGatewayComposerAllowance = require(rootPrefix + '/lib/stakeAndMint/brandedToken/CheckGatewayComposerAllowance');

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
        return oThis._initializeBTStakeMint();

      case workflowStepConstants.approveGatewayComposerTrx:
        oThis.requestParams.transactionHash = oThis.requestParams.approveTransactionHash;
        return new RecordStakerTx(oThis.requestParams).perform(oThis._currentStepPayloadForPendingTrx());

      case workflowStepConstants.checkGatewayComposerAllowance:
        return new CheckGatewayComposerAllowance(oThis.requestParams).perform();

      case workflowStepConstants.recordRequestStakeTx:
        oThis.requestParams.transactionHash = oThis.requestParams.requestStakeTransactionHash;
        return new RecordStakerTx(oThis.requestParams).perform(oThis._currentStepPayloadForPendingTrx());

      case workflowStepConstants.fetchStakeRequestHash:
        return new FetchStakeRequestHash(oThis.requestParams).perform();

      case workflowStepConstants.acceptStake:
        return new AcceptStakeByWorker(oThis.requestParams).perform(oThis._currentStepPayloadForPendingTrx());

      case workflowStepConstants.checkStakeStatus:
      case workflowStepConstants.checkProveGatewayStatus:
      case workflowStepConstants.checkConfirmStakeStatus:
      case workflowStepConstants.checkProgressStakeStatus:
      case workflowStepConstants.checkProgressMintStatus:
        let stepParams = {};
        Object.assign(stepParams, oThis.requestParams, { currentStep: oThis.stepKind });
        return new CheckProgressMintStatus(stepParams).perform();

      case workflowStepConstants.fetchStakeIntentMessageHash:
        return new FetchStakeIntentMessage(oThis.requestParams).perform();

      case workflowStepConstants.commitStateRoot:
        let params = { fromOriginToAux: 1 };
        if (oThis.isRetrialAttempt) {
          Object.assign(params, { auxChainId: oThis.requestParams.auxChainId });
        } else {
          Object.assign(params, oThis.requestParams);
        }
        return new CommitStateRoot(params).perform(oThis._currentStepPayloadForPendingTrx());

      // Update status in state root commit history
      case workflowStepConstants.updateCommittedStateRootInfo:
        return new UpdateStateRootCommits(oThis.requestParams).perform();

      case workflowStepConstants.proveGatewayOnCoGateway:
        Object.assign(oThis.requestParams, { currentWorkflowId: oThis.workflowId });
        return new ProveGateway(oThis.requestParams).perform(oThis._currentStepPayloadForPendingTrx());

      case workflowStepConstants.confirmStakeIntent:
        return new ConfirmStakeIntent(oThis.requestParams).perform(oThis._currentStepPayloadForPendingTrx());

      case workflowStepConstants.progressStake:
        return new ProgressStake(oThis.requestParams).perform(oThis._currentStepPayloadForPendingTrx());

      case workflowStepConstants.progressMint:
        return new ProgressMint(oThis.requestParams).perform(oThis._currentStepPayloadForPendingTrx());

      case workflowStepConstants.markSuccess:
        logger.step('*** Mark branded token stake and mint as success');
        return oThis.handleSuccess();

      case workflowStepConstants.markFailure:
        logger.step('*** Mark branded token stake and mint as failed');
        return oThis.handleFailure();

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

  /**
   * Initialize stake and mint BT
   *
   * @returns {String}
   *
   * @private
   */
  async _initializeBTStakeMint() {
    const oThis = this;

    let params = {
      chainId: oThis.requestParams.originChainId,
      auxChainId: oThis.requestParams.auxChainId,
      kind: chainAddressConstants.facilitator
    };
    let resp = await new ChainAddressModel().fetchAddress(params);
    if (resp.isSuccess()) {
      Object.assign(oThis.requestParams, { facilitator: resp.data.address });
    }

    return oThis.insertInitStep();
  }
}

module.exports = BtMintRouter;
