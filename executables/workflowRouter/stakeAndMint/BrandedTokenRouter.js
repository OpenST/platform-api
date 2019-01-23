'use strict';
/**
 * Branded token mint router
 *
 * @module executables/workflowRouter/stakeAndMint/BrandedTokenRouter
 */
const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  WorkflowRouterBase = require(rootPrefix + '/executables/workflowRouter/Base'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  btMintingStepsConfig = require(rootPrefix + '/executables/workflowRouter/stakeAndMint/brandedTokenConfig'),
  FetchStakeRequestHash = require(rootPrefix + '/lib/stakeMintManagement/brandedToken/FetchStakeRequestHash'),
  AddStakerSignedTrx = require(rootPrefix + '/lib/stakeMintManagement/brandedToken/AddStakerSignedTransaction'),
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
        oThis.requestParams.transactionHash = oThis.requestParams.requestStakeTransactionHash;
        return new FetchStakeRequestHash(oThis.requestParams).perform();

      case workflowStepConstants.approveGatewayComposerTrx:
        oThis.requestParams.transactionHash = oThis.requestParams.approveTransactionHash;
        return new AddStakerSignedTrx(oThis.requestParams).perform(oThis._currentStepPayloadForPendingTrx());

      case workflowStepConstants.checkGatewayComposerAllowance:
        return new CheckGatewayComposerAllowance(oThis.requestParams).perform();

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
}

module.exports = BtMintRouter;
